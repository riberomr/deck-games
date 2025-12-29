-- ==============================================================================
-- CONNECT 4 GAME - SUPABASE SETUP SCRIPT (FULL)
-- ==============================================================================

-- 0. CLEANUP (Optional - Use with caution)
-- DROP TABLE IF EXISTS public.moves;
-- DROP TABLE IF EXISTS public.matches;
-- DROP TABLE IF EXISTS public.profiles;
-- DROP TYPE IF EXISTS match_status;
-- DROP TYPE IF EXISTS match_mode;

-- 1. SETUP EXTENSIONS
create extension if not exists "uuid-ossp";

-- ==============================================================================
-- 2. TABLES & RLS
-- ==============================================================================

-- [PROFILES]
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on public.profiles for select using (true);
create policy "Users can insert their own profile." on public.profiles for insert with check (auth.uid() = id);
create policy "Users can update own profile." on public.profiles for update using (auth.uid() = id);

-- [MATCHES]
do $$ begin
    create type match_status as enum ('waiting', 'playing', 'finished', 'abandoned');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type match_mode as enum ('local', 'online');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.matches (
  id uuid default uuid_generate_v4() primary key,
  player1_id uuid references public.profiles(id) not null,
  player2_id uuid references public.profiles(id),
  winner_id uuid references public.profiles(id),
  status match_status default 'waiting'::match_status not null,
  mode match_mode not null,
  state jsonb not null default '{"board": [], "current_turn": null}', 
  started_at timestamptz default now(),
  finished_at timestamptz
);

alter table public.matches enable row level security;

create policy "Matches are viewable by everyone." on public.matches for select using (true);

create policy "Authenticated users can create matches." on public.matches for insert 
with check (auth.role() = 'authenticated' and auth.uid() = player1_id);

-- ZERO TRUST: No UPDATE policy for matches. 
-- All state changes (Move, Join, Start, Leave) MUST go through RPC functions.
-- This prevents users from manually changing the board or status.

-- [MOVES]
create table if not exists public.moves (
  id bigint generated always as identity primary key,
  match_id uuid references public.matches(id) not null,
  player_id uuid references public.profiles(id) not null,
  column_index int not null,
  move_number int not null,
  board_snapshot jsonb,
  created_at timestamptz default now()
);

alter table public.moves enable row level security;

create policy "Moves are viewable by everyone." on public.moves for select using (true);


-- ==============================================================================
-- 3. TRIGGERS
-- ==============================================================================

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Player ' || substring(new.id::text from 1 for 4)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ==============================================================================
-- 4. GAME LOGIC (RPC) - MOVES
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.make_move_connect4(
  p_match_id uuid,
  p_col_index int
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_match record;
  v_board jsonb;
  v_current_turn uuid;
  v_rows int := 6;
  v_cols int := 7;
  v_target_row int := -1;
  v_player_num int;
  v_new_state jsonb;
  v_status match_status;
  v_winner_id uuid;
  v_move_count int;
  
  -- Validation logic helpers
  r int;
  val int;
  count_consecutive int;
  directions int[][] := ARRAY[[0, 1], [1, 0], [1, 1], [1, -1]];
  d int[];
  dr int;
  dc int;
  nr int;
  nc int;
BEGIN
  -- 1. Lock Match
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;

  -- 2. Validate Match State
  IF v_match.status != 'playing' THEN RAISE EXCEPTION 'Match not active'; END IF;
  
  v_board := v_match.state->'board';
  v_current_turn := (v_match.state->>'current_turn')::uuid;

  IF v_current_turn != auth.uid() THEN RAISE EXCEPTION 'Not your turn'; END IF;
  IF p_col_index < 0 OR p_col_index >= v_cols THEN RAISE EXCEPTION 'Invalid column'; END IF;

  IF v_match.player1_id = auth.uid() THEN v_player_num := 1; ELSE v_player_num := 2; END IF;

  -- 3. Gravity Check
  FOR r IN REVERSE (v_rows - 1)..0 LOOP
    val := (v_board->r->>p_col_index)::int;
    IF val = 0 THEN v_target_row := r; EXIT; END IF;
  END LOOP;

  IF v_target_row = -1 THEN RAISE EXCEPTION 'Column full'; END IF;

  -- 4. Update Board
  v_board := jsonb_set(v_board, ARRAY[v_target_row::text, p_col_index::text], to_jsonb(v_player_num));

  -- 5. Win Check
  v_winner_id := NULL;
  FOREACH d SLICE 1 IN ARRAY directions LOOP
    dr := d[1]; dc := d[2];
    count_consecutive := 1;
    
    FOR k IN 1..3 LOOP -- Positive Direction
      nr := v_target_row + (dr * k); nc := p_col_index + (dc * k);
      IF nr >= 0 AND nr < v_rows AND nc >= 0 AND nc < v_cols THEN
        IF (v_board->nr->>nc)::int = v_player_num THEN count_consecutive := count_consecutive + 1; ELSE EXIT; END IF;
      ELSE EXIT; END IF;
    END LOOP;

    FOR k IN 1..3 LOOP -- Negative Direction
      nr := v_target_row - (dr * k); nc := p_col_index - (dc * k);
      IF nr >= 0 AND nr < v_rows AND nc >= 0 AND nc < v_cols THEN
        IF (v_board->nr->>nc)::int = v_player_num THEN count_consecutive := count_consecutive + 1; ELSE EXIT; END IF;
      ELSE EXIT; END IF;
    END LOOP;
    
    IF count_consecutive >= 4 THEN v_winner_id := auth.uid(); EXIT; END IF;
  END LOOP;

  -- 6. Update Status
  IF v_winner_id IS NOT NULL THEN
    v_status := 'finished';
    v_current_turn := NULL;
  ELSE
    -- Simple turn switch
    v_status := 'playing';
    v_current_turn := CASE WHEN v_match.player1_id = auth.uid() THEN v_match.player2_id ELSE v_match.player1_id END;
  END IF;

  v_new_state := jsonb_build_object('board', v_board, 'current_turn', v_current_turn, 'last_move_col', p_col_index, 'last_move_row', v_target_row);

  UPDATE public.matches
  SET state = v_new_state, status = v_status, winner_id = v_winner_id, finished_at = CASE WHEN v_winner_id IS NOT NULL THEN now() ELSE NULL END
  WHERE id = p_match_id;

  -- 7. Add Move History
  SELECT count(*) INTO v_move_count FROM public.moves WHERE match_id = p_match_id;
  INSERT INTO public.moves (match_id, player_id, column_index, move_number, board_snapshot)
  VALUES (p_match_id, auth.uid(), p_col_index, v_move_count + 1, v_board);

  RETURN v_new_state;
END;
$$;


-- ==============================================================================
-- 5. LOBBY LOGIC (RPC) - JOIN, START, LEAVE
-- ==============================================================================

-- [JOIN_MATCH]: Player 2 joins a waiting match
CREATE OR REPLACE FUNCTION public.join_match(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_match record;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.status != 'waiting' THEN RAISE EXCEPTION 'Match is not in waiting state'; END IF;
  IF v_match.player2_id IS NOT NULL THEN RAISE EXCEPTION 'Match is full'; END IF;
  IF v_match.player1_id = auth.uid() THEN RAISE EXCEPTION 'You cannot join your own match as Player 2'; END IF;

  UPDATE public.matches SET player2_id = auth.uid() WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'message', 'Joined match successfully');
END;
$$;


-- [START_MATCH]: Host starts the game
CREATE OR REPLACE FUNCTION public.start_match(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_match record;
  v_first_turn uuid;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF v_match.player1_id != auth.uid() THEN RAISE EXCEPTION 'Only the host can start the match'; END IF;
  IF v_match.status != 'waiting' THEN RAISE EXCEPTION 'Match is not waiting to start'; END IF;
  IF v_match.player2_id IS NULL THEN RAISE EXCEPTION 'Cannot start without a second player'; END IF;

  -- 50% chance for P1 or P2 to go first
  IF random() < 0.5 THEN v_first_turn := v_match.player1_id; ELSE v_first_turn := v_match.player2_id; END IF;

  UPDATE public.matches
  SET 
    status = 'playing',
    started_at = now(),
    state = jsonb_set(state, '{current_turn}', to_jsonb(v_first_turn))
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'status', 'playing');
END;
$$;


-- [LEAVE_MATCH]: Handle leaving lobby or forfeiting game
CREATE OR REPLACE FUNCTION public.leave_match(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_match record;
  v_opponent_id uuid;
BEGIN
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF auth.uid() != v_match.player1_id AND auth.uid() != v_match.player2_id THEN RAISE EXCEPTION 'Not a participant'; END IF;

  IF v_match.status = 'waiting' THEN
    IF auth.uid() = v_match.player1_id THEN
       UPDATE public.matches SET status = 'abandoned', finished_at = now() WHERE id = p_match_id;
       RETURN jsonb_build_object('action', 'cancelled', 'message', 'Match abandoned by host');
    ELSE
       UPDATE public.matches SET player2_id = NULL WHERE id = p_match_id;
       RETURN jsonb_build_object('action', 'left', 'message', 'Left lobby');
    END IF;

  ELSIF v_match.status = 'playing' THEN
    IF auth.uid() = v_match.player1_id THEN v_opponent_id := v_match.player2_id; ELSE v_opponent_id := v_match.player1_id; END IF;
    
    UPDATE public.matches 
    SET status = 'finished', winner_id = v_opponent_id, finished_at = now(), state = jsonb_set(state, '{winner}', to_jsonb(v_opponent_id))
    WHERE id = p_match_id;
    RETURN jsonb_build_object('action', 'forfeit', 'winner', v_opponent_id);

  ELSE
    RAISE EXCEPTION 'Match already finished';
  END IF;
END;
$$;
