CREATE OR REPLACE FUNCTION public.update_match_details(
  p_match_id uuid,
  p_team_a_id uuid,
  p_team_b_id uuid,
  p_scheduled_at timestamptz DEFAULT NULL,
  p_notes text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_match public.matches%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem editar partidas';
  END IF;

  SELECT * INTO v_match FROM public.matches WHERE id = p_match_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Partida não encontrada';
  END IF;

  PERFORM public.validate_match_teams(v_match.round_id, v_match.draw_id, p_team_a_id, p_team_b_id);

  UPDATE public.matches
     SET team_a_id = p_team_a_id,
         team_b_id = p_team_b_id,
         scheduled_at = p_scheduled_at,
         notes = p_notes,
         updated_at = now()
   WHERE id = p_match_id;
END;
$$;

REVOKE ALL ON FUNCTION public.update_match_details(uuid, uuid, uuid, timestamptz, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_match_details(uuid, uuid, uuid, timestamptz, text) TO authenticated;