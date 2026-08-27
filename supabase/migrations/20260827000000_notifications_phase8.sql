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
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_own_read" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "notifications_own_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "announcements_published_read" ON public.announcements FOR SELECT TO authenticated USING (status = 'published' AND (expires_at IS NULL OR expires_at > now()) OR public.has_role(auth.uid(), 'admin'));
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
    FROM public.players p WHERE p.user_id IS NOT NULL;
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
