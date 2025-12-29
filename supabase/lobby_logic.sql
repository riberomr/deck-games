-- ==============================================================================
-- LOBBY LOGIC (RPCs)
-- These functions handle the "Zero Trust" lifecycle of a match before gameplay.
-- ==============================================================================

-- 1. JOIN MATCH
-- Allows a user to join a specific match if there is an open slot.
CREATE OR REPLACE FUNCTION public.join_match(p_match_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_match record;
BEGIN
  -- Lock the row
  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id FOR UPDATE;
  
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
  
  -- Validations
  IF v_match.status != 'waiting' THEN
    RAISE EXCEPTION 'Match is not in waiting state';
  END IF;
  
  IF v_match.player2_id IS NOT NULL THEN
    RAISE EXCEPTION 'Match is full';
  END IF;
  
  IF v_match.player1_id = auth.uid() THEN
    RAISE EXCEPTION 'You cannot join your own match as Player 2';
  END IF;

  -- Execution
  UPDATE public.matches
  SET player2_id = auth.uid()
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'message', 'Joined match successfully');
END;
$$;


-- 2. START MATCH
-- Allows the Host (Player 1) to start the game once Player 2 has joined.
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
  
  -- Validations
  IF v_match.player1_id != auth.uid() THEN
    RAISE EXCEPTION 'Only the host ca start the match';
  END IF;
  
  IF v_match.status != 'waiting' THEN
    RAISE EXCEPTION 'Match is not waiting to start';
  END IF;
  
  IF v_match.player2_id IS NULL THEN
    RAISE EXCEPTION 'Cannot start without a second player';
  END IF;

  -- Randomize Logic: 50% chance for P1 or P2 to start
  IF random() < 0.5 THEN
    v_first_turn := v_match.player1_id;
  ELSE
    v_first_turn := v_match.player2_id;
  END IF;

  -- Execution
  UPDATE public.matches
  SET 
    status = 'playing',
    started_at = now(),
    state = jsonb_set(
        state, 
        '{current_turn}', 
        to_jsonb(v_first_turn)
    ) -- Logic to initialize empty board is already in default, or we can reset here if needed.
  WHERE id = p_match_id;

  RETURN jsonb_build_object('success', true, 'status', 'playing');
END;
$$;


-- 3. LEAVE MATCH / FORFEIT
-- Handles leaving during lobby (disconnect) or forfeiting during game.
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

  IF auth.uid() != v_match.player1_id AND auth.uid() != v_match.player2_id THEN
    RAISE EXCEPTION 'You are not a participant in this match';
  END IF;

  -- SCENARIO A: Lobby Phase (Waiting)
  IF v_match.status = 'waiting' THEN
    
    -- If Host leaves, cancel the match
    IF auth.uid() = v_match.player1_id THEN
       UPDATE public.matches SET status = 'abandoned', finished_at = now() WHERE id = p_match_id;
       RETURN jsonb_build_object('action', 'cancelled', 'message', 'Match abandoned by host');
    
    -- If P2 leaves, free the slot
    ELSE
       UPDATE public.matches SET player2_id = NULL WHERE id = p_match_id;
       RETURN jsonb_build_object('action', 'left', 'message', 'You left the lobby');
    END IF;

  -- SCENARIO B: Active Game (Playing) -> Forfeit
  ELSIF v_match.status = 'playing' THEN
    
    -- Determine winner (the one who didn't leave)
    IF auth.uid() = v_match.player1_id THEN
       v_opponent_id := v_match.player2_id;
    ELSE
       v_opponent_id := v_match.player1_id;
    END IF;

    UPDATE public.matches 
    SET 
      status = 'finished', 
      winner_id = v_opponent_id,
      finished_at = now(),
      state = jsonb_set(state, '{winner}', to_jsonb(v_opponent_id)) -- Add winner to JSON too for frontend convenience
    WHERE id = p_match_id;
    
    RETURN jsonb_build_object('action', 'forfeit', 'winner', v_opponent_id);

  ELSE
    RAISE EXCEPTION 'Match is already finished or abandoned';
  END IF;

END;
$$;
