CREATE OR REPLACE FUNCTION public.create_player(
  p_name text,
  p_position_id uuid,
  p_overall_rating numeric,
  p_nickname text DEFAULT NULL,
  p_shirt_number integer DEFAULT NULL,
  p_photo_url text DEFAULT NULL,
  p_status text DEFAULT 'active'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas administradores podem cadastrar jogadores.';
  END IF;

  INSERT INTO public.players (name, nickname, shirt_number, overall_rating, photo_url, status)
  VALUES (p_name, p_nickname, p_shirt_number, p_overall_rating, p_photo_url, COALESCE(p_status, 'active'))
  RETURNING id INTO v_id;

  INSERT INTO public.player_positions (player_id, position_id, is_primary)
  VALUES (v_id, p_position_id, true);

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_player(text, uuid, numeric, text, integer, text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_player(text, uuid, numeric, text, integer, text, text) TO authenticated;