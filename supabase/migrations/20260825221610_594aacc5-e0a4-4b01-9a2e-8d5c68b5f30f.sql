CREATE TABLE public.round_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id uuid NOT NULL REFERENCES public.rounds(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  participation_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (round_id, player_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.round_players TO authenticated;
GRANT ALL ON public.round_players TO service_role;

ALTER TABLE public.round_players ENABLE ROW LEVEL SECURITY;

CREATE POLICY round_players_read ON public.round_players FOR SELECT TO authenticated USING (true);

CREATE POLICY round_players_admin_write ON public.round_players FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY round_players_update_own ON public.round_players FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.players p WHERE p.id = round_players.player_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.players p WHERE p.id = round_players.player_id AND p.user_id = auth.uid()));

CREATE TRIGGER round_players_set_updated_at BEFORE UPDATE ON public.round_players
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();