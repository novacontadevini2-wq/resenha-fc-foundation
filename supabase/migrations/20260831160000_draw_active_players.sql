CREATE OR REPLACE FUNCTION public.perform_draw(p_round_id UUID, p_teams_count INTEGER, p_players_per_team INTEGER, p_player_ids UUID[])
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_draw_id UUID;
  team_id UUID;
  item RECORD;
  expected_count INTEGER := p_teams_count * p_players_per_team;
  selected_count INTEGER;
  duplicate_count INTEGER;
  min_score NUMERIC;
  position_penalty NUMERIC := 0;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can perform draws'; END IF;
  IF p_teams_count < 2 OR p_players_per_team < 1 THEN RAISE EXCEPTION 'Invalid draw configuration'; END IF;
  IF p_player_ids IS NULL THEN RAISE EXCEPTION 'Players are required'; END IF;
  SELECT count(*), count(DISTINCT value) INTO selected_count, duplicate_count FROM unnest(p_player_ids) AS value;
  IF selected_count <> expected_count OR duplicate_count <> selected_count THEN RAISE EXCEPTION 'Selected players do not match configuration'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_player_ids) selected(id) WHERE NOT EXISTS (SELECT 1 FROM public.players p WHERE p.id = selected.id AND p.status = 'active')) THEN RAISE EXCEPTION 'A selected player is not eligible'; END IF;

  INSERT INTO public.draws (round_id, teams_count, players_per_team, created_by) VALUES (p_round_id, p_teams_count, p_players_per_team, auth.uid()) RETURNING id INTO new_draw_id;
  FOR item IN SELECT generate_series(1, p_teams_count) AS team_number LOOP
    INSERT INTO public.draw_teams (draw_id, team_number) VALUES (new_draw_id, item.team_number);
  END LOOP;
  FOR item IN
    SELECT p.id, p.name, p.overall_rating, pos.code AS position_code, pos.name AS position_name
    FROM public.players p
    LEFT JOIN LATERAL (SELECT po.code, po.name FROM public.player_positions pp JOIN public.positions po ON po.id = pp.position_id WHERE pp.player_id = p.id ORDER BY pp.is_primary DESC LIMIT 1) pos ON true
    WHERE p.id = ANY(p_player_ids) AND p.status = 'active'
    ORDER BY p.overall_rating DESC, random()
  LOOP
    SELECT dt.id INTO team_id FROM public.draw_teams dt LEFT JOIN public.draw_team_players dtp ON dtp.team_id = dt.id LEFT JOIN LATERAL (SELECT count(*)::NUMERIC AS position_count FROM public.draw_team_players existing WHERE existing.team_id = dt.id AND existing.position_code_snapshot IS NOT DISTINCT FROM item.position_code) pc ON true WHERE dt.draw_id = new_draw_id GROUP BY dt.id, dt.team_number, dt.total_rating, pc.position_count HAVING count(dtp.id) < p_players_per_team ORDER BY (dt.total_rating + (pc.position_count * 0.5)), random() LIMIT 1;
    INSERT INTO public.draw_team_players (draw_id, team_id, player_id, player_name_snapshot, rating_snapshot, position_code_snapshot, position_name_snapshot, photo_url_snapshot) VALUES (new_draw_id, team_id, item.id, item.name, item.overall_rating, item.position_code, item.position_name, (SELECT photo_url FROM public.players WHERE id = item.id));
    UPDATE public.draw_teams SET total_rating = total_rating + item.overall_rating WHERE id = team_id;
  END LOOP;
  SELECT max(total_rating) - min(total_rating) INTO min_score FROM public.draw_teams WHERE draw_id = new_draw_id;
  SELECT COALESCE(sum(max_count - min_count) * 0.5, 0) INTO position_penalty FROM (SELECT position_code_snapshot, max(player_count)::NUMERIC AS max_count, min(player_count)::NUMERIC AS min_count FROM (SELECT dtp.position_code_snapshot, dtp.team_id, count(*)::NUMERIC AS player_count FROM public.draw_team_players dtp WHERE dtp.draw_id = new_draw_id AND dtp.position_code_snapshot IS NOT NULL GROUP BY dtp.position_code_snapshot, dtp.team_id) position_totals GROUP BY position_code_snapshot) position_spread;
  UPDATE public.draws SET balance_score = COALESCE(min_score, 0) + position_penalty WHERE id = new_draw_id;
  RETURN new_draw_id;
END;
$$;
