
CREATE OR REPLACE FUNCTION public.my_player_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.players WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.set_my_round_participation(p_round_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_player uuid;
BEGIN
  IF p_status NOT IN ('confirmed','declined','pending') THEN
    RAISE EXCEPTION 'Situação de presença inválida';
  END IF;
  v_player := public.my_player_id();
  IF v_player IS NULL THEN
    RAISE EXCEPTION 'Seu usuário ainda não está vinculado a um jogador do elenco';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rounds WHERE id = p_round_id AND status <> 'cancelled') THEN
    RAISE EXCEPTION 'Rodada indisponível para confirmação';
  END IF;

  INSERT INTO public.round_players (round_id, player_id, participation_status)
  VALUES (p_round_id, v_player, p_status)
  ON CONFLICT (round_id, player_id)
  DO UPDATE SET participation_status = EXCLUDED.participation_status, updated_at = now();
END;
$$;

DROP POLICY IF EXISTS round_players_insert_own ON public.round_players;
CREATE POLICY round_players_insert_own ON public.round_players
FOR INSERT TO authenticated
WITH CHECK (player_id = public.my_player_id());
