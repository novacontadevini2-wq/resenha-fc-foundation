CREATE TABLE public.draws (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES public.rounds(id) ON DELETE RESTRICT,
  teams_count INTEGER NOT NULL,
  players_per_team INTEGER NOT NULL,
  algorithm_version TEXT NOT NULL DEFAULT 'v1',
  status TEXT NOT NULL DEFAULT 'completed',
  balance_score NUMERIC(8,3) NOT NULL DEFAULT 0,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ,
  CONSTRAINT draws_team_count_check CHECK (teams_count BETWEEN 2 AND 12),
  CONSTRAINT draws_players_count_check CHECK (players_per_team BETWEEN 1 AND 20),
  CONSTRAINT draws_status_check CHECK (status IN ('completed', 'confirmed', 'cancelled'))
);

CREATE TABLE public.draw_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  team_number INTEGER NOT NULL,
  total_rating NUMERIC(8,2) NOT NULL DEFAULT 0,
  UNIQUE (draw_id, team_number)
);

CREATE TABLE public.draw_team_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_id UUID NOT NULL REFERENCES public.draws(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.draw_teams(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE RESTRICT,
  player_name_snapshot TEXT NOT NULL,
  rating_snapshot NUMERIC(3,1) NOT NULL,
  position_code_snapshot TEXT,
  position_name_snapshot TEXT,
  photo_url_snapshot TEXT,
  UNIQUE (team_id, player_id),
  UNIQUE (draw_id, player_id)
);

CREATE UNIQUE INDEX draws_one_confirmed_per_round_idx ON public.draws(round_id) WHERE status = 'confirmed';
CREATE INDEX draws_round_idx ON public.draws(round_id, created_at DESC);
CREATE INDEX draw_teams_draw_idx ON public.draw_teams(draw_id, team_number);

GRANT SELECT ON public.draws, public.draw_teams, public.draw_team_players TO authenticated;
GRANT ALL ON public.draws, public.draw_teams, public.draw_team_players TO service_role;
ALTER TABLE public.draws ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.draw_team_players ENABLE ROW LEVEL SECURITY;
CREATE POLICY "draws_authenticated_read" ON public.draws FOR SELECT TO authenticated USING (status = 'confirmed' OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "draw_teams_authenticated_read" ON public.draw_teams FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.draws d WHERE d.id = draw_id AND (d.status = 'confirmed' OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "draw_team_players_authenticated_read" ON public.draw_team_players FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.draw_teams dt JOIN public.draws d ON d.id = dt.draw_id WHERE dt.id = team_id AND (d.status = 'confirmed' OR public.has_role(auth.uid(), 'admin'))));

CREATE OR REPLACE FUNCTION public.perform_draw(p_round_id UUID, p_teams_count INTEGER, p_players_per_team INTEGER, p_player_ids UUID[])
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_draw_id UUID;
  team_id UUID;
  item RECORD;
  expected_count INTEGER := p_teams_count * p_players_per_team;
  eligible_count INTEGER;
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
  SELECT count(*) INTO eligible_count FROM public.round_players rp JOIN public.players p ON p.id = rp.player_id WHERE rp.round_id = p_round_id AND rp.participation_status = 'confirmed' AND p.status = 'active';
  IF selected_count > eligible_count THEN RAISE EXCEPTION 'Not enough eligible players'; END IF;
  IF EXISTS (SELECT 1 FROM unnest(p_player_ids) selected(id) WHERE NOT EXISTS (SELECT 1 FROM public.round_players rp JOIN public.players p ON p.id = rp.player_id WHERE rp.round_id = p_round_id AND rp.player_id = selected.id AND rp.participation_status = 'confirmed' AND p.status = 'active')) THEN RAISE EXCEPTION 'A selected player is not eligible'; END IF;

  INSERT INTO public.draws (round_id, teams_count, players_per_team, created_by) VALUES (p_round_id, p_teams_count, p_players_per_team, auth.uid()) RETURNING id INTO new_draw_id;
  FOR item IN SELECT generate_series(1, p_teams_count) AS team_number LOOP
    INSERT INTO public.draw_teams (draw_id, team_number) VALUES (new_draw_id, item.team_number);
  END LOOP;

  FOR item IN
    SELECT p.id, p.name, p.overall_rating, pos.code AS position_code, pos.name AS position_name
    FROM public.players p
    JOIN public.round_players rp ON rp.player_id = p.id AND rp.round_id = p_round_id AND rp.participation_status = 'confirmed'
    LEFT JOIN LATERAL (SELECT po.code, po.name FROM public.player_positions pp JOIN public.positions po ON po.id = pp.position_id WHERE pp.player_id = p.id ORDER BY pp.is_primary DESC LIMIT 1) pos ON true
    WHERE p.id = ANY(p_player_ids) AND p.status = 'active'
    ORDER BY p.overall_rating DESC, random()
  LOOP
    SELECT dt.id INTO team_id FROM public.draw_teams dt LEFT JOIN public.draw_team_players dtp ON dtp.team_id = dt.id LEFT JOIN LATERAL (SELECT count(*)::NUMERIC AS position_count FROM public.draw_team_players existing WHERE existing.team_id = dt.id AND existing.position_code_snapshot IS NOT DISTINCT FROM item.position_code) pc ON true WHERE dt.draw_id = new_draw_id GROUP BY dt.id, dt.team_number, dt.total_rating, pc.position_count HAVING count(dtp.id) < p_players_per_team ORDER BY (dt.total_rating + (pc.position_count * 0.5)), random() LIMIT 1;
    INSERT INTO public.draw_team_players (draw_id, team_id, player_id, player_name_snapshot, rating_snapshot, position_code_snapshot, position_name_snapshot, photo_url_snapshot) VALUES (new_draw_id, team_id, item.id, item.name, item.overall_rating, item.position_code, item.position_name, (SELECT photo_url FROM public.players WHERE id = item.id));
    UPDATE public.draw_teams SET total_rating = total_rating + item.overall_rating WHERE id = team_id;
  END LOOP;

  SELECT max(total_rating) - min(total_rating) INTO min_score FROM public.draw_teams WHERE draw_id = new_draw_id;
  SELECT COALESCE(sum(max_count - min_count) * 0.5, 0) INTO position_penalty
  FROM (
    SELECT position_code_snapshot, max(player_count)::NUMERIC AS max_count, min(player_count)::NUMERIC AS min_count
    FROM (
      SELECT dtp.position_code_snapshot, dtp.team_id, count(*)::NUMERIC AS player_count
      FROM public.draw_team_players dtp
      WHERE dtp.draw_id = new_draw_id AND dtp.position_code_snapshot IS NOT NULL
      GROUP BY dtp.position_code_snapshot, dtp.team_id
    ) position_totals
    GROUP BY position_code_snapshot
  ) position_spread;
  UPDATE public.draws SET balance_score = COALESCE(min_score, 0) + position_penalty WHERE id = new_draw_id;
  RETURN new_draw_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.confirm_draw(p_draw_id UUID)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE round_id_value UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can confirm draws'; END IF;
  SELECT round_id INTO round_id_value FROM public.draws WHERE id = p_draw_id AND status <> 'cancelled';
  IF round_id_value IS NULL THEN RAISE EXCEPTION 'Draw not found'; END IF;
  UPDATE public.draws SET status = 'completed' WHERE round_id = round_id_value AND status = 'confirmed' AND id <> p_draw_id;
  UPDATE public.draws SET status = 'confirmed', confirmed_at = now() WHERE id = p_draw_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.perform_draw(UUID, INTEGER, INTEGER, UUID[]) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.confirm_draw(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.perform_draw(UUID, INTEGER, INTEGER, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_draw(UUID) TO authenticated;
