CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE RESTRICT,
  draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE RESTRICT,
  team_a_id UUID NOT NULL REFERENCES public.draw_teams(id) ON DELETE RESTRICT,
  team_b_id UUID NOT NULL REFERENCES public.draw_teams(id) ON DELETE RESTRICT,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'scheduled',
  score_a INTEGER NOT NULL DEFAULT 0,
  score_b INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT matches_different_teams_check CHECK (team_a_id <> team_b_id),
  CONSTRAINT matches_score_a_check CHECK (score_a >= 0),
  CONSTRAINT matches_score_b_check CHECK (score_b >= 0),
  CONSTRAINT matches_status_check CHECK (status IN ('scheduled', 'in_progress', 'finished', 'cancelled'))
);

CREATE TABLE public.match_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  team_id UUID NOT NULL REFERENCES public.draw_teams(id) ON DELETE RESTRICT,
  minute INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT match_goals_minute_check CHECK (minute IS NULL OR minute >= 0)
);

CREATE INDEX matches_round_idx ON public.matches(round_id, scheduled_at);
CREATE INDEX matches_status_idx ON public.matches(status, scheduled_at);
CREATE INDEX match_goals_match_idx ON public.match_goals(match_id, created_at);

GRANT SELECT ON public.matches, public.match_goals TO authenticated;
GRANT ALL ON public.matches, public.match_goals TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_authenticated_read" ON public.matches FOR SELECT TO authenticated USING (true);
CREATE POLICY "match_goals_authenticated_read" ON public.match_goals FOR SELECT TO authenticated USING (true);
CREATE TRIGGER matches_set_updated_at BEFORE UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER match_goals_set_updated_at BEFORE UPDATE ON public.match_goals
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.validate_match_teams(
  p_round_id UUID,
  p_draw_id UUID,
  p_team_a_id UUID,
  p_team_b_id UUID
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  draw_round_id UUID;
  team_a_draw_id UUID;
  team_b_draw_id UUID;
BEGIN
  SELECT round_id INTO draw_round_id FROM public.draws WHERE id = p_draw_id AND status = 'confirmed';
  IF draw_round_id IS NULL OR draw_round_id <> p_round_id THEN RAISE EXCEPTION 'Draw does not belong to the round'; END IF;
  SELECT draw_id INTO team_a_draw_id FROM public.draw_teams WHERE id = p_team_a_id;
  SELECT draw_id INTO team_b_draw_id FROM public.draw_teams WHERE id = p_team_b_id;
  IF team_a_draw_id IS NULL OR team_b_draw_id IS NULL OR team_a_draw_id <> p_draw_id OR team_b_draw_id <> p_draw_id THEN RAISE EXCEPTION 'Teams do not belong to the draw'; END IF;
  IF p_team_a_id = p_team_b_id THEN RAISE EXCEPTION 'A match needs two different teams'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_match(
  p_round_id UUID,
  p_draw_id UUID,
  p_team_a_id UUID,
  p_team_b_id UUID,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_match_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can create matches'; END IF;
  PERFORM public.validate_match_teams(p_round_id, p_draw_id, p_team_a_id, p_team_b_id);
  INSERT INTO public.matches (round_id, draw_id, team_a_id, team_b_id, scheduled_at, notes)
  VALUES (p_round_id, p_draw_id, p_team_a_id, p_team_b_id, p_scheduled_at, NULLIF(trim(p_notes), ''))
  RETURNING id INTO new_match_id;
  RETURN new_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_match(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can start matches'; END IF;
  UPDATE public.matches SET status = 'in_progress', started_at = COALESCE(started_at, now())
  WHERE id = p_match_id AND status = 'scheduled';
  IF NOT FOUND THEN RAISE EXCEPTION 'Match cannot be started'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_match_score(p_match_id UUID, p_score_a INTEGER, p_score_b INTEGER)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  goal_a INTEGER;
  goal_b INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update match scores'; END IF;
  IF p_score_a < 0 OR p_score_b < 0 THEN RAISE EXCEPTION 'Scores cannot be negative'; END IF;
  SELECT count(*) FILTER (WHERE team_id = m.team_a_id), count(*) FILTER (WHERE team_id = m.team_b_id)
  INTO goal_a, goal_b FROM public.matches m LEFT JOIN public.match_goals g ON g.match_id = m.id WHERE m.id = p_match_id GROUP BY m.team_a_id, m.team_b_id;
  IF goal_a IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF p_score_a < goal_a OR p_score_b < goal_b THEN RAISE EXCEPTION 'Score cannot be lower than registered goals'; END IF;
  UPDATE public.matches SET score_a = p_score_a, score_b = p_score_b WHERE id = p_match_id AND status = 'in_progress';
  IF NOT FOUND THEN RAISE EXCEPTION 'Only matches in progress can be updated'; END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.register_match_goal(
  p_match_id UUID,
  p_player_id UUID,
  p_team_id UUID,
  p_minute INTEGER DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  match_row public.matches%ROWTYPE;
  goal_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can register goals'; END IF;
  IF p_minute IS NOT NULL AND p_minute < 0 THEN RAISE EXCEPTION 'Goal minute cannot be negative'; END IF;
  SELECT * INTO match_row FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF match_row.id IS NULL OR match_row.status <> 'in_progress' THEN RAISE EXCEPTION 'Goals can only be registered during a match'; END IF;
  IF p_team_id <> match_row.team_a_id AND p_team_id <> match_row.team_b_id THEN RAISE EXCEPTION 'Team does not belong to the match'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.draw_team_players WHERE team_id = p_team_id AND draw_id = match_row.draw_id AND player_id = p_player_id) THEN RAISE EXCEPTION 'Player does not belong to the selected team'; END IF;
  INSERT INTO public.match_goals (match_id, player_id, team_id, minute) VALUES (p_match_id, p_player_id, p_team_id, p_minute) RETURNING id INTO goal_id;
  UPDATE public.matches SET score_a = score_a + CASE WHEN p_team_id = team_a_id THEN 1 ELSE 0 END, score_b = score_b + CASE WHEN p_team_id = team_b_id THEN 1 ELSE 0 END WHERE id = p_match_id;
  RETURN goal_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_match_goal(
  p_goal_id UUID,
  p_player_id UUID,
  p_team_id UUID,
  p_minute INTEGER DEFAULT NULL
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  goal_row public.match_goals%ROWTYPE;
  match_row public.matches%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update goals'; END IF;
  SELECT * INTO goal_row FROM public.match_goals WHERE id = p_goal_id FOR UPDATE;
  SELECT * INTO match_row FROM public.matches WHERE id = goal_row.match_id FOR UPDATE;
  IF goal_row.id IS NULL OR match_row.status <> 'in_progress' THEN RAISE EXCEPTION 'Only goals from matches in progress can be updated'; END IF;
  IF p_minute IS NOT NULL AND p_minute < 0 THEN RAISE EXCEPTION 'Goal minute cannot be negative'; END IF;
  IF p_team_id <> match_row.team_a_id AND p_team_id <> match_row.team_b_id THEN RAISE EXCEPTION 'Team does not belong to the match'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.draw_team_players WHERE team_id = p_team_id AND draw_id = match_row.draw_id AND player_id = p_player_id) THEN RAISE EXCEPTION 'Player does not belong to the selected team'; END IF;
  UPDATE public.match_goals SET player_id = p_player_id, team_id = p_team_id, minute = p_minute WHERE id = p_goal_id;
  UPDATE public.matches SET score_a = (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_a_id), score_b = (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_b_id) WHERE id = match_row.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_match_goal(p_goal_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  goal_row public.match_goals%ROWTYPE;
  match_row public.matches%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can delete goals'; END IF;
  SELECT * INTO goal_row FROM public.match_goals WHERE id = p_goal_id FOR UPDATE;
  SELECT * INTO match_row FROM public.matches WHERE id = goal_row.match_id FOR UPDATE;
  IF goal_row.id IS NULL OR match_row.status <> 'in_progress' THEN RAISE EXCEPTION 'Only goals from matches in progress can be deleted'; END IF;
  DELETE FROM public.match_goals WHERE id = p_goal_id;
  UPDATE public.matches SET score_a = (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_a_id), score_b = (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_b_id) WHERE id = match_row.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_match(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  match_row public.matches%ROWTYPE;
  goal_a INTEGER;
  goal_b INTEGER;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can finish matches'; END IF;
  SELECT * INTO match_row FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF match_row.id IS NULL OR match_row.status <> 'in_progress' THEN RAISE EXCEPTION 'Only matches in progress can be finished'; END IF;
  SELECT count(*) FILTER (WHERE team_id = match_row.team_a_id), count(*) FILTER (WHERE team_id = match_row.team_b_id) INTO goal_a, goal_b FROM public.match_goals WHERE match_id = p_match_id;
  IF match_row.score_a <> goal_a OR match_row.score_b <> goal_b THEN RAISE EXCEPTION 'Registered goals do not match the score'; END IF;
  UPDATE public.matches SET status = 'finished', finished_at = now() WHERE id = p_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.cancel_match(p_match_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can cancel matches'; END IF;
  UPDATE public.matches SET status = 'cancelled' WHERE id = p_match_id AND status IN ('scheduled', 'in_progress');
  IF NOT FOUND THEN RAISE EXCEPTION 'Match cannot be cancelled'; END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.validate_match_teams(UUID, UUID, UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.create_match(UUID, UUID, UUID, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.start_match(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_match_score(UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_match_goal(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_match_goal(UUID, UUID, UUID, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.delete_match_goal(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.finish_match(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.cancel_match(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_match(UUID, UUID, UUID, UUID, TIMESTAMPTZ, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.start_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_match_score(UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_match_goal(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_match_goal(UUID, UUID, UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_match_goal(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.finish_match(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_match(UUID) TO authenticated;
