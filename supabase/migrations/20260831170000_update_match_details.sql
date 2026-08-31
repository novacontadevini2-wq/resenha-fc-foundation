CREATE OR REPLACE FUNCTION public.update_match_details(
  p_match_id UUID,
  p_team_a_id UUID,
  p_team_b_id UUID,
  p_scheduled_at TIMESTAMPTZ DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  match_row public.matches%ROWTYPE;
  team_a_draw UUID;
  team_b_draw UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can update matches';
  END IF;
  SELECT * INTO match_row FROM public.matches WHERE id = p_match_id FOR UPDATE;
  IF match_row.id IS NULL THEN RAISE EXCEPTION 'Match not found'; END IF;
  IF match_row.status IN ('finished', 'cancelled') THEN RAISE EXCEPTION 'This match cannot be edited'; END IF;
  IF p_team_a_id = p_team_b_id THEN RAISE EXCEPTION 'A match needs two different teams'; END IF;
  SELECT draw_id INTO team_a_draw FROM public.draw_teams WHERE id = p_team_a_id;
  SELECT draw_id INTO team_b_draw FROM public.draw_teams WHERE id = p_team_b_id;
  IF team_a_draw IS NULL OR team_a_draw <> match_row.draw_id OR team_b_draw IS NULL OR team_b_draw <> match_row.draw_id THEN
    RAISE EXCEPTION 'Teams do not belong to the match draw';
  END IF;
  UPDATE public.matches
  SET team_a_id = p_team_a_id, team_b_id = p_team_b_id, scheduled_at = p_scheduled_at, notes = NULLIF(trim(p_notes), '')
  WHERE id = p_match_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.update_match_details(UUID, UUID, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_match_details(UUID, UUID, UUID, TIMESTAMPTZ, TEXT) TO authenticated;
