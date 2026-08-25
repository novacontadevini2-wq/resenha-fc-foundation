UPDATE public.seasons
SET status = CASE lower(status)
  WHEN 'planned' THEN 'planned'
  WHEN 'active' THEN 'active'
  WHEN 'finished' THEN 'finished'
  WHEN 'archived' THEN 'archived'
  ELSE 'planned'
END;

UPDATE public.rounds
SET status = CASE lower(status)
  WHEN 'scheduled' THEN 'scheduled'
  WHEN 'open' THEN 'open'
  WHEN 'in_progress' THEN 'in_progress'
  WHEN 'finished' THEN 'finished'
  WHEN 'cancelled' THEN 'cancelled'
  ELSE 'scheduled'
END;

UPDATE public.seasons
SET status = 'finished'
WHERE status = 'active'
  AND id <> (SELECT id FROM public.seasons WHERE status = 'active' ORDER BY start_date DESC, created_at DESC LIMIT 1);

ALTER TABLE public.seasons
  ADD CONSTRAINT seasons_status_check CHECK (status IN ('planned', 'active', 'finished', 'archived')),
  ADD CONSTRAINT seasons_date_check CHECK (end_date IS NULL OR end_date >= start_date);

ALTER TABLE public.rounds
  ADD CONSTRAINT rounds_status_check CHECK (status IN ('scheduled', 'open', 'in_progress', 'finished', 'cancelled')),
  ADD CONSTRAINT rounds_time_check CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time);

CREATE TABLE public.round_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  participation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id),
  CONSTRAINT round_players_status_check CHECK (participation_status IN ('pending', 'confirmed', 'absent'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.round_players TO authenticated;
GRANT ALL ON public.round_players TO service_role;
ALTER TABLE public.round_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "round_players_read" ON public.round_players FOR SELECT TO authenticated USING (true);
CREATE POLICY "round_players_admin_insert" ON public.round_players FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "round_players_admin_delete" ON public.round_players FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "round_players_admin_update" ON public.round_players FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "round_players_self_update" ON public.round_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = player_id AND p.user_id = auth.uid()));

CREATE OR REPLACE FUNCTION public.protect_round_player_self_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') AND (NEW.round_id <> OLD.round_id OR NEW.player_id <> OLD.player_id) THEN
    RAISE EXCEPTION 'Players may only update participation status';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER round_players_protect_self_update
  BEFORE UPDATE ON public.round_players
  FOR EACH ROW EXECUTE FUNCTION public.protect_round_player_self_update();
CREATE TRIGGER round_players_set_updated_at BEFORE UPDATE ON public.round_players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE UNIQUE INDEX seasons_one_active_idx ON public.seasons (status) WHERE status = 'active';
CREATE INDEX rounds_schedule_idx ON public.rounds (scheduled_date, start_time);
CREATE INDEX round_players_round_idx ON public.round_players (round_id, participation_status);
