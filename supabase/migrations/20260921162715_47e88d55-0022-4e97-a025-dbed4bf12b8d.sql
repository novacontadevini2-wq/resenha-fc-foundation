DO $$
DECLARE
  draw_row RECORD;
  match_row RECORD;
  new_team_a_id UUID;
  new_team_b_id UUID;
BEGIN
  FOR draw_row IN
    SELECT id, round_id
      FROM public.draws
     WHERE status = 'confirmed'
  LOOP
    FOR match_row IN
      SELECT m.id,
             old_a.team_number AS team_a_number,
             old_b.team_number AS team_b_number
        FROM public.matches m
        JOIN public.draw_teams old_a ON old_a.id = m.team_a_id
        JOIN public.draw_teams old_b ON old_b.id = m.team_b_id
       WHERE m.round_id = draw_row.round_id
         AND m.draw_id <> draw_row.id
    LOOP
      SELECT id INTO new_team_a_id
        FROM public.draw_teams
       WHERE draw_id = draw_row.id
         AND team_number = match_row.team_a_number;

      SELECT id INTO new_team_b_id
        FROM public.draw_teams
       WHERE draw_id = draw_row.id
         AND team_number = match_row.team_b_number;

      IF new_team_a_id IS NULL OR new_team_b_id IS NULL THEN
        CONTINUE;
      END IF;

      IF EXISTS (
        SELECT 1
          FROM public.match_goals goal
         WHERE goal.match_id = match_row.id
           AND NOT EXISTS (
             SELECT 1
               FROM public.draw_team_players player
              WHERE player.draw_id = draw_row.id
                AND player.player_id = goal.player_id
           )
      ) THEN
        CONTINUE;
      END IF;

      UPDATE public.match_goals goal
         SET team_id = player.team_id,
             updated_at = now()
        FROM public.draw_team_players player
       WHERE goal.match_id = match_row.id
         AND player.draw_id = draw_row.id
         AND player.player_id = goal.player_id;

      UPDATE public.match_assists assist
         SET team_id = player.team_id,
             updated_at = now()
        FROM public.draw_team_players player
       WHERE assist.match_id = match_row.id
         AND player.draw_id = draw_row.id
         AND player.player_id = assist.player_id;

      UPDATE public.goalkeeper_stats stat
         SET team_id = player.team_id,
             updated_at = now()
        FROM public.draw_team_players player
       WHERE stat.match_id = match_row.id
         AND player.draw_id = draw_row.id
         AND player.player_id = stat.player_id;

      UPDATE public.matches
         SET draw_id = draw_row.id,
             team_a_id = new_team_a_id,
             team_b_id = new_team_b_id,
             score_a = (
               SELECT count(*)::INTEGER
                 FROM public.match_goals
                WHERE match_id = match_row.id
                  AND team_id = new_team_a_id
             ),
             score_b = (
               SELECT count(*)::INTEGER
                 FROM public.match_goals
                WHERE match_id = match_row.id
                  AND team_id = new_team_b_id
             ),
             updated_at = now()
       WHERE id = match_row.id;
    END LOOP;
  END LOOP;
END;
$$;