CREATE OR REPLACE FUNCTION public.create_player(
  p_name TEXT,
  p_nickname TEXT,
  p_shirt_number INTEGER,
  p_overall_rating NUMERIC,
  p_photo_url TEXT,
  p_position_id UUID,
  p_status TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_player_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can create players';
  END IF;

  INSERT INTO public.players (name, nickname, shirt_number, overall_rating, photo_url, status)
  VALUES (p_name, p_nickname, p_shirt_number, p_overall_rating, p_photo_url, p_status)
  RETURNING id INTO new_player_id;

  INSERT INTO public.player_positions (player_id, position_id, is_primary)
  VALUES (new_player_id, p_position_id, true);

  RETURN new_player_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_player(TEXT, TEXT, INTEGER, NUMERIC, TEXT, UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_player(TEXT, TEXT, INTEGER, NUMERIC, TEXT, UUID, TEXT) TO authenticated;
