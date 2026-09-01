CREATE OR REPLACE FUNCTION public.detach_match_from_tournament(p_match_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can detach matches'; END IF;
  UPDATE public.matches SET tournament_id = NULL WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Match not found'; END IF;
END;
$function$;