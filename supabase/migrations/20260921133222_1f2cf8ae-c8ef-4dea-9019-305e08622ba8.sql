CREATE OR REPLACE FUNCTION public.set_my_round_participation(p_round_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_player uuid;
  v_name text;
  v_date date;
  v_admin uuid;
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

  IF p_status = 'confirmed' THEN
    SELECT coalesce(nickname, name) INTO v_name FROM public.players WHERE id = v_player;
    SELECT scheduled_date INTO v_date FROM public.rounds WHERE id = p_round_id;
    FOR v_admin IN SELECT user_id FROM public.user_roles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (user_id, type, title, message, related_entity_type, related_entity_id, event_key)
      VALUES (
        v_admin,
        'presence_confirmed',
        'Presença confirmada',
        v_name || ' confirmou presença na rodada de ' || to_char(v_date, 'DD/MM/YYYY') || '.',
        'round',
        p_round_id,
        'presence:' || p_round_id::text || ':' || v_player::text || ':' || v_admin::text
      )
      ON CONFLICT (event_key) DO UPDATE SET created_at = now(), read_at = NULL, message = EXCLUDED.message;
    END LOOP;
  END IF;
END;
$function$;