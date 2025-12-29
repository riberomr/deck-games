-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 1. PROFILES
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on public.profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on public.profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on public.profiles for update
  using ( auth.uid() = id );

-- Trigger to handle new user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. MATCHES
create type match_status as enum ('waiting', 'playing', 'finished', 'abandoned');
create type match_mode as enum ('local', 'online');

create table public.matches (
  id uuid default uuid_generate_v4() primary key,
  player1_id uuid references public.profiles(id) not null,
  player2_id uuid references public.profiles(id), -- Nullable initially for open lobbies
  winner_id uuid references public.profiles(id),
  status match_status default 'waiting'::match_status not null,
  mode match_mode not null,
  state jsonb not null default '{"board": [], "current_turn": null}', 
  started_at timestamptz default now(),
  finished_at timestamptz
);

alter table public.matches enable row level security;

-- Policies for matches will be refined, but basic ones:
create policy "Matches are viewable by participants (or everyone for now)."
  on public.matches for select
  using ( true ); 

create policy "Authenticated users can create matches."
  on public.matches for insert
  with check ( auth.role() = 'authenticated' and auth.uid() = player1_id );

-- IMPORTANT: Prevent direct updates to game state.
-- Only allow joining a match (updating player2_id) or updating status if it is waiting.
create policy "Users can join waiting matches."
  on public.matches for update
  using ( 
    auth.uid() = player2_id -- allowing player2 to update (e.g. ready up?)
    or 
    (status = 'waiting' and player2_id is null) -- allowing a user to join
  )
  with check (
    -- Can only update to become player2
    (status = 'waiting' and player2_id = auth.uid()) 
  );
-- Note: This update policy is restrictive. The RPC will bypass RLS because it runs as SECURITY DEFINER or owner.


-- 3. MOVES
create table public.moves (
  id bigint generated always as identity primary key,
  match_id uuid references public.matches(id) not null,
  player_id uuid references public.profiles(id) not null,
  column_index int not null,
  move_number int not null, -- Sequential number of the move in the match
  board_snapshot jsonb,     -- Optional: State after the move
  created_at timestamptz default now()
);

alter table public.moves enable row level security;

create policy "Moves are viewable by everyone."
  on public.moves for select
  using ( true );

-- No insert policy for moves. Only created via RPC.
