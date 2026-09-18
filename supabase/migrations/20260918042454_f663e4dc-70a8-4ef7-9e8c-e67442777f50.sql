
CREATE OR REPLACE FUNCTION public.claim_player_profile(p_player_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Você precisa estar conectado';
  END IF;
  IF EXISTS (SELECT 1 FROM public.players WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'Sua conta já está vinculada a um jogador';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.players WHERE id = p_player_id AND user_id IS NULL) THEN
    RAISE EXCEPTION 'Este jogador já foi vinculado a outra conta';
  END IF;
  UPDATE public.players SET user_id = auth.uid(), updated_at = now() WHERE id = p_player_id;
END;
$$;
