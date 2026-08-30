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

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tournaments, public.tournament_teams, public.match_assists, public.goalkeeper_stats TO authenticated;
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
CREATE POLICY "match_assists_admin_write" ON public.match_assists FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "goalkeeper_stats_admin_write" ON public.goalkeeper_stats FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
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

CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  related_entity_type TEXT,
  related_entity_id UUID,
  event_key TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT notifications_type_check CHECK (type IN ('round', 'presence', 'draw', 'result', 'tournament', 'ranking', 'announcement')),
  UNIQUE (user_id, event_key)
);

CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT announcements_status_check CHECK (status IN ('draft', 'published', 'expired'))
);

CREATE INDEX notifications_user_idx ON public.notifications(user_id, created_at DESC);
CREATE INDEX announcements_public_idx ON public.announcements(status, published_at DESC);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.notifications, public.announcements TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own_read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "announcements_published_read" ON public.announcements FOR SELECT TO authenticated USING ((status = 'published' AND (expires_at IS NULL OR expires_at > now())) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "announcements_admin_write" ON public.announcements FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER announcements_set_updated_at BEFORE UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID, p_type TEXT, p_title TEXT, p_message TEXT,
  p_event_key TEXT, p_related_entity_type TEXT DEFAULT NULL, p_related_entity_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, event_key, related_entity_type, related_entity_id)
  VALUES (p_user_id, p_type, p_title, p_message, p_event_key, p_related_entity_type, p_related_entity_id)
  ON CONFLICT (user_id, event_key) DO NOTHING
  RETURNING id INTO notification_id;
  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_presence_reminder(p_round_id UUID)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE notification_id UUID; round_date TEXT; round_time TEXT; participant_status TEXT;
BEGIN
  SELECT to_char(scheduled_date, 'DD/MM/YYYY'), COALESCE(to_char(start_time, 'HH24:MI'), 'horário não informado') INTO round_date, round_time FROM public.rounds WHERE id = p_round_id AND status NOT IN ('cancelled', 'finished');
  IF round_date IS NULL THEN RETURN NULL; END IF;
  SELECT participation_status INTO participant_status FROM public.round_players WHERE round_id = p_round_id AND player_id = (SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1);
  IF participant_status IS DISTINCT FROM 'pending' THEN RETURN NULL; END IF;
  SELECT public.create_notification(auth.uid(), 'presence', 'Confirme sua presença', 'Você ainda não confirmou sua presença para a rodada de ' || round_date || ' às ' || round_time || '.', 'presence-reminder-' || p_round_id, 'round', p_round_id) INTO notification_id;
  RETURN notification_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_round_participants(p_round_id UUID, p_type TEXT, p_title TEXT, p_message TEXT, p_event_key TEXT, p_entity_type TEXT DEFAULT 'round', p_entity_id UUID DEFAULT NULL)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total INTEGER;
BEGIN
  SELECT count(*) INTO total FROM (
    SELECT DISTINCT p.user_id FROM public.round_players rp JOIN public.players p ON p.id = rp.player_id WHERE rp.round_id = p_round_id AND rp.participation_status IN ('confirmed', 'pending') AND p.user_id IS NOT NULL
  ) participants;
  INSERT INTO public.notifications (user_id, type, title, message, event_key, related_entity_type, related_entity_id)
  SELECT DISTINCT p.user_id, p_type, p_title, p_message, p_event_key, p_entity_type, COALESCE(p_entity_id, p_round_id)
  FROM public.round_players rp JOIN public.players p ON p.id = rp.player_id
  WHERE rp.round_id = p_round_id AND rp.participation_status IN ('confirmed', 'pending') AND p.user_id IS NOT NULL
  ON CONFLICT (user_id, event_key) DO NOTHING;
  RETURN total;
END;
$$;

CREATE OR REPLACE FUNCTION public.publish_announcement(p_announcement_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE announcement_row public.announcements%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can publish announcements'; END IF;
  UPDATE public.announcements SET status = 'published', published_at = COALESCE(published_at, now()) WHERE id = p_announcement_id RETURNING * INTO announcement_row;
  IF announcement_row.id IS NULL THEN RAISE EXCEPTION 'Announcement not found'; END IF;
  INSERT INTO public.notifications (user_id, type, title, message, event_key, related_entity_type, related_entity_id)
  SELECT DISTINCT p.user_id, 'announcement', announcement_row.title, announcement_row.content, 'announcement-' || announcement_row.id, 'announcement', announcement_row.id
  FROM public.players p WHERE p.user_id IS NOT NULL
  ON CONFLICT (user_id, event_key) DO NOTHING;
END;
$$;

CREATE OR REPLACE FUNCTION public.unpublish_announcement(p_announcement_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can unpublish announcements'; END IF;
  UPDATE public.announcements SET status = 'draft', published_at = NULL WHERE id = p_announcement_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_tournament_status(p_tournament_id UUID, p_status TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tournament_name TEXT; tournament_season UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update tournaments'; END IF;
  IF p_status NOT IN ('planned', 'active', 'finished', 'cancelled') THEN RAISE EXCEPTION 'Invalid tournament status'; END IF;
  UPDATE public.tournaments SET status = p_status WHERE id = p_tournament_id RETURNING name, season_id INTO tournament_name, tournament_season;
  IF tournament_name IS NULL THEN RAISE EXCEPTION 'Tournament not found'; END IF;
  IF p_status = 'active' THEN
    INSERT INTO public.notifications (user_id, type, title, message, event_key, related_entity_type, related_entity_id)
    SELECT DISTINCT p.user_id, 'tournament', 'Torneio iniciado', 'O torneio ' || tournament_name || ' começou!', 'tournament-started-' || p_tournament_id, 'tournament', p_tournament_id
    FROM public.players p WHERE p.user_id IS NOT NULL
    ON CONFLICT (user_id, event_key) DO NOTHING;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_draw_confirmed()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.notify_round_participants(NEW.round_id, 'draw', 'Times sorteados', 'Os times da próxima pelada já foram sorteados!', 'draw-confirmed-' || NEW.id, 'draw', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_match_finished()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status = 'finished' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM public.notify_round_participants(NEW.round_id, 'result', 'Resultado disponível', 'O resultado da partida já está disponível.', 'match-finished-' || NEW.id, 'match', NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER draws_notify_confirmed AFTER UPDATE ON public.draws FOR EACH ROW EXECUTE FUNCTION public.notify_draw_confirmed();
CREATE TRIGGER matches_notify_finished AFTER UPDATE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.notify_match_finished();

REVOKE EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.ensure_presence_reminder(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.notify_round_participants(UUID, TEXT, TEXT, TEXT, TEXT, TEXT, UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.publish_announcement(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unpublish_announcement(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_tournament_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_presence_reminder(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.publish_announcement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unpublish_announcement(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_tournament_status(UUID, TEXT) TO authenticated;

CREATE TABLE public.club_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity_type, action);
GRANT SELECT ON public.club_settings TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.club_settings, public.audit_logs TO service_role;
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_settings_admin_read" ON public.club_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "club_settings_admin_write" ON public.club_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.write_audit_log(p_action TEXT, p_entity_type TEXT, p_entity_id UUID, p_before JSONB, p_after JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE audit_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can write audit logs'; END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, before_data, after_data) VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after) RETURNING id INTO audit_id;
  RETURN audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE before_json JSONB; after_json JSONB; entity_id UUID; action_name TEXT;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN before_json := to_jsonb(OLD); entity_id := OLD.id; END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN after_json := to_jsonb(NEW); entity_id := NEW.id; END IF;
  action_name := lower(TG_OP) || '_' || TG_TABLE_NAME;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, before_data, after_data) VALUES (auth.uid(), action_name, TG_TABLE_NAME, entity_id, before_json, after_json);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_club_settings(p_key TEXT, p_value JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update settings'; END IF;
  INSERT INTO public.club_settings (key, value, updated_by) VALUES (p_key, p_value, auth.uid()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, after_data) VALUES (auth.uid(), 'update_settings', 'club_settings', NULL, jsonb_build_object('key', p_key, 'value', p_value));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_settings()
RETURNS SETOF public.club_settings LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.club_settings
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY key;
$$;

REVOKE EXECUTE ON FUNCTION public.write_audit_log(TEXT, TEXT, UUID, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_club_settings(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_club_settings(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_settings() TO authenticated;

CREATE TRIGGER audit_players AFTER INSERT OR UPDATE OR DELETE ON public.players FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_rounds AFTER INSERT OR UPDATE OR DELETE ON public.rounds FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_matches AFTER INSERT OR UPDATE OR DELETE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_goals AFTER INSERT OR UPDATE OR DELETE ON public.match_goals FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_assists AFTER INSERT OR UPDATE OR DELETE ON public.match_assists FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_tournaments AFTER INSERT OR UPDATE OR DELETE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_announcements AFTER INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_seasons AFTER INSERT OR UPDATE OR DELETE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_goalkeeper_stats AFTER INSERT OR UPDATE OR DELETE ON public.goalkeeper_stats FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();

DROP POLICY IF EXISTS "player_photos_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_admin_update" ON storage.objects;

CREATE POLICY "player_photos_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'player-photos'
    AND public.has_role(auth.uid(), 'admin')
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND lower(COALESCE(metadata->>'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp')
    AND CASE
      WHEN (metadata->>'size') ~ '^[0-9]+$' THEN (metadata->>'size')::bigint
      ELSE 0
    END BETWEEN 1 AND 5242880
  );

CREATE POLICY "player_photos_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'player-photos'
    AND public.has_role(auth.uid(), 'admin')
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND lower(COALESCE(metadata->>'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp')
    AND CASE
      WHEN (metadata->>'size') ~ '^[0-9]+$' THEN (metadata->>'size')::bigint
      ELSE 0
    END BETWEEN 1 AND 5242880
  );