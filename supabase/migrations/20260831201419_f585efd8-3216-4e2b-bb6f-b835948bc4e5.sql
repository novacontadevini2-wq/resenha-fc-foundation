CREATE OR REPLACE FUNCTION public.set_match_score(p_match_id uuid, p_score_a integer, p_score_b integer)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE goal_a INTEGER; goal_b INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update match scores'; END IF;
  IF p_score_a < 0 OR p_score_b < 0 THEN RAISE EXCEPTION 'Scores cannot be negative'; END IF;
  SELECT count(*) FILTER (WHERE g.team_id = m.team_a_id), count(*) FILTER (WHERE g.team_id = m.team_b_id) INTO goal_a, goal_b
  FROM public.matches m LEFT JOIN public.match_goals g ON g.match_id = m.id WHERE m.id = p_match_id GROUP BY m.team_a_id, m.team_b_id;
  IF goal_a IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF p_score_a < goal_a OR p_score_b < goal_b THEN RAISE EXCEPTION 'Score cannot be lower than registered goals'; END IF;
  UPDATE public.matches SET score_a = p_score_a, score_b = p_score_b WHERE id = p_match_id AND status <> 'cancelled';
  IF NOT FOUND THEN RAISE EXCEPTION 'Cancelled matches cannot be updated'; END IF;
END; $function$;

CREATE OR REPLACE FUNCTION public.update_match_goal_with_assist(p_goal_id uuid, p_player_id uuid, p_team_id uuid, p_minute integer DEFAULT NULL::integer, p_assist_player_id uuid DEFAULT NULL::uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE goal_row public.match_goals%ROWTYPE; match_row public.matches%ROWTYPE; assist_team UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update goals'; END IF;
  SELECT * INTO goal_row FROM public.match_goals WHERE id = p_goal_id FOR UPDATE;
  SELECT * INTO match_row FROM public.matches WHERE id = goal_row.match_id FOR UPDATE;
  IF goal_row.id IS NULL OR match_row.status = 'cancelled' THEN RAISE EXCEPTION 'Goals of cancelled matches cannot be updated'; END IF;
  IF p_assist_player_id IS NOT NULL AND p_assist_player_id = p_player_id THEN RAISE EXCEPTION 'A player cannot assist their own goal'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.draw_team_players WHERE draw_id = match_row.draw_id AND team_id = p_team_id AND player_id = p_player_id) THEN RAISE EXCEPTION 'Scorer does not belong to the selected team'; END IF;
  IF p_assist_player_id IS NOT NULL THEN
    SELECT team_id INTO assist_team FROM public.draw_team_players WHERE draw_id = match_row.draw_id AND player_id = p_assist_player_id;
    IF assist_team IS NULL OR assist_team <> p_team_id THEN RAISE EXCEPTION 'Assist provider must belong to the scoring team'; END IF;
  END IF;
  UPDATE public.match_goals SET player_id = p_player_id, team_id = p_team_id, minute = p_minute WHERE id = p_goal_id;
  DELETE FROM public.match_assists WHERE goal_id = p_goal_id;
  IF p_assist_player_id IS NOT NULL THEN INSERT INTO public.match_assists (goal_id, match_id, player_id, team_id, created_by) VALUES (p_goal_id, goal_row.match_id, p_assist_player_id, p_team_id, auth.uid()); END IF;
  UPDATE public.matches SET score_a = GREATEST(score_a, (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_a_id)), score_b = GREATEST(score_b, (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_b_id)) WHERE id = match_row.id;
END; $function$;

CREATE OR REPLACE FUNCTION public.register_match_goal_with_assist(p_match_id uuid, p_player_id uuid, p_team_id uuid, p_minute integer DEFAULT NULL::integer, p_assist_player_id uuid DEFAULT NULL::uuid)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE goal_id UUID; match_row public.matches%ROWTYPE; assist_team UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can register goals'; END IF;
  SELECT * INTO match_row FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF match_row.id IS NULL OR match_row.status = 'cancelled' THEN RAISE EXCEPTION 'Goals cannot be registered for cancelled matches'; END IF;
  IF p_assist_player_id IS NOT NULL AND p_assist_player_id = p_player_id THEN RAISE EXCEPTION 'A player cannot assist their own goal'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.draw_team_players WHERE draw_id = match_row.draw_id AND team_id = p_team_id AND player_id = p_player_id) THEN RAISE EXCEPTION 'Scorer does not belong to the selected team'; END IF;
  IF p_assist_player_id IS NOT NULL THEN
    SELECT team_id INTO assist_team FROM public.draw_team_players WHERE draw_id = match_row.draw_id AND player_id = p_assist_player_id;
    IF assist_team IS NULL OR assist_team <> p_team_id THEN RAISE EXCEPTION 'Assist provider must belong to the scoring team'; END IF;
  END IF;
  INSERT INTO public.match_goals (match_id, player_id, team_id, minute) VALUES (p_match_id, p_player_id, p_team_id, p_minute) RETURNING id INTO goal_id;
  UPDATE public.matches SET score_a = score_a + CASE WHEN p_team_id = team_a_id THEN 1 ELSE 0 END, score_b = score_b + CASE WHEN p_team_id = team_b_id THEN 1 ELSE 0 END WHERE id = p_match_id;
  IF p_assist_player_id IS NOT NULL THEN INSERT INTO public.match_assists (goal_id, match_id, player_id, team_id, created_by) VALUES (goal_id, p_match_id, p_assist_player_id, p_team_id, auth.uid()); END IF;
  RETURN goal_id;
END; $function$;

CREATE OR REPLACE FUNCTION public.delete_match_goal(p_goal_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE goal_row public.match_goals%ROWTYPE; match_row public.matches%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can delete goals'; END IF;
  SELECT * INTO goal_row FROM public.match_goals WHERE id = p_goal_id FOR UPDATE;
  IF goal_row.id IS NULL THEN RAISE EXCEPTION 'Goal not found'; END IF;
  SELECT * INTO match_row FROM public.matches WHERE id = goal_row.match_id FOR UPDATE;
  IF match_row.status = 'cancelled' THEN RAISE EXCEPTION 'Goals of cancelled matches cannot be deleted'; END IF;
  DELETE FROM public.match_assists WHERE goal_id = p_goal_id;
  DELETE FROM public.match_goals WHERE id = p_goal_id;
  UPDATE public.matches SET score_a = (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_a_id), score_b = (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_b_id) WHERE id = match_row.id;
END; $function$;

CREATE OR REPLACE FUNCTION public.delete_match(p_match_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can delete matches'; END IF;
  DELETE FROM public.match_assists WHERE match_id = p_match_id;
  DELETE FROM public.match_goals WHERE match_id = p_match_id;
  DELETE FROM public.goalkeeper_stats WHERE match_id = p_match_id;
  DELETE FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
END; $function$;