CREATE TABLE public.tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id UUID NOT NULL REFERENCES public.seasons(id) ON DELETE RESTRICT,
  name TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  description TEXT,
  points_win INTEGER NOT NULL DEFAULT 3,
  points_draw INTEGER NOT NULL DEFAULT 1,
  points_loss INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tournaments_dates_check CHECK (end_date IS NULL OR start_date IS NULL OR end_date >= start_date),
  CONSTRAINT tournaments_points_check CHECK (points_win >= 0 AND points_draw >= 0 AND points_loss >= 0),
  CONSTRAINT tournaments_status_check CHECK (status IN ('planned', 'active', 'finished', 'cancelled'))
);

ALTER TABLE public.matches ADD COLUMN tournament_id UUID REFERENCES public.tournaments(id) ON DELETE SET NULL;

CREATE TABLE public.tournament_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.draw_teams(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, team_id)
);

CREATE TABLE public.match_assists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id UUID NOT NULL UNIQUE REFERENCES public.match_goals(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  team_id UUID NOT NULL REFERENCES public.draw_teams(id) ON DELETE RESTRICT,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.goalkeeper_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  team_id UUID NOT NULL REFERENCES public.draw_teams(id) ON DELETE RESTRICT,
  goals_conceded INTEGER NOT NULL DEFAULT 0,
  saves INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (match_id, player_id),
  CONSTRAINT goalkeeper_goals_check CHECK (goals_conceded >= 0),
  CONSTRAINT goalkeeper_saves_check CHECK (saves IS NULL OR saves >= 0)
);

CREATE INDEX tournaments_season_idx ON public.tournaments(season_id, status);
CREATE INDEX tournament_teams_tournament_idx ON public.tournament_teams(tournament_id);
CREATE INDEX match_assists_match_idx ON public.match_assists(match_id);
CREATE INDEX goalkeeper_stats_player_idx ON public.goalkeeper_stats(player_id);

GRANT SELECT ON public.tournaments, public.tournament_teams, public.match_assists, public.goalkeeper_stats TO authenticated;
GRANT ALL ON public.tournaments, public.tournament_teams, public.match_assists, public.goalkeeper_stats TO service_role;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_assists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goalkeeper_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tournaments_authenticated_read" ON public.tournaments FOR SELECT TO authenticated USING (true);
CREATE POLICY "tournament_teams_authenticated_read" ON public.tournament_teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "match_assists_authenticated_read" ON public.match_assists FOR SELECT TO authenticated USING (true);
CREATE POLICY "goalkeeper_stats_authenticated_read" ON public.goalkeeper_stats FOR SELECT TO authenticated USING (true);
CREATE POLICY "tournaments_admin_write" ON public.tournaments FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "tournament_teams_admin_write" ON public.tournament_teams FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER tournaments_set_updated_at BEFORE UPDATE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER match_assists_set_updated_at BEFORE UPDATE ON public.match_assists FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER goalkeeper_stats_set_updated_at BEFORE UPDATE ON public.goalkeeper_stats FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.attach_match_to_tournament(p_match_id UUID, p_tournament_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE match_row public.matches%ROWTYPE; tournament_season UUID; round_season UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can attach matches'; END IF;
  SELECT * INTO match_row FROM public.matches WHERE id = p_match_id;
  SELECT season_id INTO tournament_season FROM public.tournaments WHERE id = p_tournament_id;
  SELECT season_id INTO round_season FROM public.rounds WHERE id = match_row.round_id;
  IF match_row.id IS NULL OR tournament_season IS NULL OR tournament_season IS DISTINCT FROM round_season THEN RAISE EXCEPTION 'Match and tournament must belong to the same season'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.tournament_teams WHERE tournament_id = p_tournament_id AND team_id IN (match_row.team_a_id, match_row.team_b_id)) THEN RAISE EXCEPTION 'Match teams must be added to the tournament'; END IF;
  UPDATE public.matches SET tournament_id = p_tournament_id WHERE id = p_match_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_tournament_team(p_tournament_id UUID, p_team_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tournament_season UUID; team_draw UUID; team_round UUID; team_membership UUID; membership_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can add tournament teams'; END IF;
  SELECT season_id INTO tournament_season FROM public.tournaments WHERE id = p_tournament_id;
  SELECT draw_id INTO team_draw FROM public.draw_teams WHERE id = p_team_id;
  SELECT round_id INTO team_round FROM public.draws WHERE id = team_draw;
  SELECT season_id INTO team_membership FROM public.rounds WHERE id = team_round;
  IF tournament_season IS NULL OR team_membership IS DISTINCT FROM tournament_season THEN RAISE EXCEPTION 'Team and tournament must belong to the same season'; END IF;
  INSERT INTO public.tournament_teams (tournament_id, team_id) VALUES (p_tournament_id, p_team_id) ON CONFLICT (tournament_id, team_id) DO NOTHING RETURNING id INTO membership_id;
  RETURN COALESCE(membership_id, (SELECT id FROM public.tournament_teams WHERE tournament_id = p_tournament_id AND team_id = p_team_id));
END;
$$;

CREATE OR REPLACE FUNCTION public.register_match_goal_with_assist(p_match_id UUID, p_player_id UUID, p_team_id UUID, p_minute INTEGER DEFAULT NULL, p_assist_player_id UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE goal_id UUID; match_row public.matches%ROWTYPE; assist_team UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can register goals'; END IF;
  SELECT * INTO match_row FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF match_row.id IS NULL OR match_row.status <> 'in_progress' THEN RAISE EXCEPTION 'Goals can only be registered during a match'; END IF;
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
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_goalkeeper_stats(p_match_id UUID, p_player_id UUID, p_team_id UUID, p_goals_conceded INTEGER, p_saves INTEGER DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE stat_id UUID; match_row public.matches%ROWTYPE; position_code TEXT;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update goalkeeper stats'; END IF;
  SELECT * INTO match_row FROM public.matches WHERE id = p_match_id;
  IF match_row.id IS NULL OR match_row.status <> 'finished' THEN RAISE EXCEPTION 'Goalkeeper stats require a finished match'; END IF;
  IF p_goals_conceded < 0 OR (p_saves IS NOT NULL AND p_saves < 0) THEN RAISE EXCEPTION 'Goalkeeper values cannot be negative'; END IF;
  IF p_team_id <> match_row.team_a_id AND p_team_id <> match_row.team_b_id THEN RAISE EXCEPTION 'Team does not belong to the match'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.draw_team_players WHERE draw_id = match_row.draw_id AND team_id = p_team_id AND player_id = p_player_id) THEN RAISE EXCEPTION 'Goalkeeper does not belong to the selected team'; END IF;
  SELECT pos.code INTO position_code FROM public.player_positions pp JOIN public.positions pos ON pos.id = pp.position_id WHERE pp.player_id = p_player_id AND pp.is_primary;
  IF position_code <> 'GOL' THEN RAISE EXCEPTION 'Player is not registered as a goalkeeper'; END IF;
  INSERT INTO public.goalkeeper_stats (match_id, player_id, team_id, goals_conceded, saves) VALUES (p_match_id, p_player_id, p_team_id, p_goals_conceded, p_saves) ON CONFLICT (match_id, player_id) DO UPDATE SET team_id = EXCLUDED.team_id, goals_conceded = EXCLUDED.goals_conceded, saves = EXCLUDED.saves RETURNING id INTO stat_id;
  RETURN stat_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_match_goal_with_assist(p_goal_id UUID, p_player_id UUID, p_team_id UUID, p_minute INTEGER DEFAULT NULL, p_assist_player_id UUID DEFAULT NULL)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE goal_row public.match_goals%ROWTYPE; match_row public.matches%ROWTYPE; assist_team UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update goals'; END IF;
  SELECT * INTO goal_row FROM public.match_goals WHERE id = p_goal_id FOR UPDATE;
  SELECT * INTO match_row FROM public.matches WHERE id = goal_row.match_id FOR UPDATE;
  IF goal_row.id IS NULL OR match_row.status <> 'in_progress' THEN RAISE EXCEPTION 'Only goals from matches in progress can be updated'; END IF;
  IF p_assist_player_id IS NOT NULL AND p_assist_player_id = p_player_id THEN RAISE EXCEPTION 'A player cannot assist their own goal'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.draw_team_players WHERE draw_id = match_row.draw_id AND team_id = p_team_id AND player_id = p_player_id) THEN RAISE EXCEPTION 'Scorer does not belong to the selected team'; END IF;
  IF p_assist_player_id IS NOT NULL THEN
    SELECT team_id INTO assist_team FROM public.draw_team_players WHERE draw_id = match_row.draw_id AND player_id = p_assist_player_id;
    IF assist_team IS NULL OR assist_team <> p_team_id THEN RAISE EXCEPTION 'Assist provider must belong to the scoring team'; END IF;
  END IF;
  UPDATE public.match_goals SET player_id = p_player_id, team_id = p_team_id, minute = p_minute WHERE id = p_goal_id;
  DELETE FROM public.match_assists WHERE goal_id = p_goal_id;
  IF p_assist_player_id IS NOT NULL THEN INSERT INTO public.match_assists (goal_id, match_id, player_id, team_id, created_by) VALUES (p_goal_id, goal_row.match_id, p_assist_player_id, p_team_id, auth.uid()); END IF;
  UPDATE public.matches SET score_a = (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_a_id), score_b = (SELECT count(*) FROM public.match_goals WHERE match_id = match_row.id AND team_id = match_row.team_b_id) WHERE id = match_row.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.attach_match_to_tournament(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.add_tournament_team(UUID, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.register_match_goal_with_assist(UUID, UUID, UUID, INTEGER, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.upsert_goalkeeper_stats(UUID, UUID, UUID, INTEGER, INTEGER) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_match_goal_with_assist(UUID, UUID, UUID, INTEGER, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_match_to_tournament(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.add_tournament_team(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.register_match_goal_with_assist(UUID, UUID, UUID, INTEGER, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_goalkeeper_stats(UUID, UUID, UUID, INTEGER, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_match_goal_with_assist(UUID, UUID, UUID, INTEGER, UUID) TO authenticated;
