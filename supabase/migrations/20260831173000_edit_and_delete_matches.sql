CREATE OR REPLACE FUNCTION public.set_match_score(p_match_id UUID, p_score_a INTEGER, p_score_b INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  goal_a INTEGER;
  goal_b INTEGER;
  match_status TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update match scores'; END IF;
  IF p_score_a < 0 OR p_score_b < 0 THEN RAISE EXCEPTION 'Scores cannot be negative'; END IF;
  SELECT m.status, count(*) FILTER (WHERE g.team_id = m.team_a_id), count(*) FILTER (WHERE g.team_id = m.team_b_id)
    INTO match_status, goal_a, goal_b
    FROM public.matches m LEFT JOIN public.match_goals g ON g.match_id = m.id
    WHERE m.id = p_match_id GROUP BY m.id;
  IF match_status IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF match_status = 'cancelled' THEN RAISE EXCEPTION 'Cancelled matches cannot be updated'; END IF;
  IF p_score_a < goal_a OR p_score_b < goal_b THEN RAISE EXCEPTION 'Score cannot be lower than registered goals'; END IF;
  UPDATE public.matches SET score_a = p_score_a, score_b = p_score_b WHERE id = p_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_match_goal_with_assist(
  p_goal_id UUID, p_player_id UUID, p_team_id UUID, p_minute INTEGER DEFAULT NULL, p_assist_player_id UUID DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  goal_row public.match_goals%ROWTYPE;
  match_row public.matches%ROWTYPE;
  assist_team UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update goals'; END IF;
  SELECT * INTO goal_row FROM public.match_goals WHERE id = p_goal_id FOR UPDATE;
  SELECT * INTO match_row FROM public.matches WHERE id = goal_row.match_id FOR UPDATE;
  IF goal_row.id IS NULL OR match_row.status = 'cancelled' THEN RAISE EXCEPTION 'This goal cannot be updated'; END IF;
  IF p_minute IS NOT NULL AND p_minute < 0 THEN RAISE EXCEPTION 'Goal minute cannot be negative'; END IF;
  IF p_assist_player_id IS NOT NULL AND p_assist_player_id = p_player_id THEN RAISE EXCEPTION 'A player cannot assist their own goal'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.draw_team_players WHERE draw_id = match_row.draw_id AND team_id = p_team_id AND player_id = p_player_id) THEN RAISE EXCEPTION 'Scorer does not belong to the selected team'; END IF;
  IF p_assist_player_id IS NOT NULL THEN
    SELECT team_id INTO assist_team FROM public.draw_team_players WHERE draw_id = match_row.draw_id AND player_id = p_assist_player_id;
    IF assist_team IS NULL OR assist_team <> p_team_id THEN RAISE EXCEPTION 'Assist provider must belong to the scoring team'; END IF;
  END IF;
  UPDATE public.match_goals SET player_id = p_player_id, team_id = p_team_id, minute = p_minute WHERE id = p_goal_id;
  DELETE FROM public.match_assists WHERE goal_id = p_goal_id;
  IF p_assist_player_id IS NOT NULL THEN
    INSERT INTO public.match_assists (goal_id, match_id, player_id, team_id, created_by)
    VALUES (p_goal_id, goal_row.match_id, p_assist_player_id, p_team_id, auth.uid());
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_match_goal(p_goal_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  goal_match_id UUID;
  match_status TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can delete goals'; END IF;
  SELECT g.match_id, m.status INTO goal_match_id, match_status
    FROM public.match_goals g JOIN public.matches m ON m.id = g.match_id
    WHERE g.id = p_goal_id FOR UPDATE;
  IF goal_match_id IS NULL THEN RAISE EXCEPTION 'Goal not found'; END IF;
  IF match_status = 'cancelled' THEN RAISE EXCEPTION 'This goal cannot be deleted'; END IF;
  DELETE FROM public.match_goals WHERE id = p_goal_id;
  UPDATE public.matches m
    SET score_a = (SELECT count(*) FROM public.match_goals g WHERE g.match_id = m.id AND g.team_id = m.team_a_id),
        score_b = (SELECT count(*) FROM public.match_goals g WHERE g.match_id = m.id AND g.team_id = m.team_b_id)
    WHERE m.id = goal_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_match(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can delete matches'; END IF;
  DELETE FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.delete_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_match(UUID) TO authenticated;
