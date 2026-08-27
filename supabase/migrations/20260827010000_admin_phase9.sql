CREATE TABLE public.club_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before_data JSONB,
  after_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_created_idx ON public.audit_logs(created_at DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs(entity_type, action);
GRANT SELECT ON public.club_settings TO authenticated;
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.club_settings, public.audit_logs TO service_role;
ALTER TABLE public.club_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "club_settings_admin_read" ON public.club_settings FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "club_settings_admin_write" ON public.club_settings FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "audit_logs_admin_read" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.write_audit_log(p_action TEXT, p_entity_type TEXT, p_entity_id UUID, p_before JSONB, p_after JSONB)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE audit_id UUID;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can write audit logs'; END IF;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, before_data, after_data) VALUES (auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after) RETURNING id INTO audit_id;
  RETURN audit_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_row_change()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE before_json JSONB; after_json JSONB; entity_id UUID; action_name TEXT;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN before_json := to_jsonb(OLD); entity_id := OLD.id; END IF;
  IF TG_OP IN ('INSERT', 'UPDATE') THEN after_json := to_jsonb(NEW); entity_id := NEW.id; END IF;
  action_name := lower(TG_OP) || '_' || TG_TABLE_NAME;
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, before_data, after_data) VALUES (auth.uid(), action_name, TG_TABLE_NAME, entity_id, before_json, after_json);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.update_club_settings(p_key TEXT, p_value JSONB)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Only admins can update settings'; END IF;
  INSERT INTO public.club_settings (key, value, updated_by) VALUES (p_key, p_value, auth.uid()) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_by = auth.uid(), updated_at = now();
  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, after_data) VALUES (auth.uid(), 'update_settings', 'club_settings', NULL, jsonb_build_object('key', p_key, 'value', p_value));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_admin_settings()
RETURNS SETOF public.club_settings LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT * FROM public.club_settings
  WHERE public.has_role(auth.uid(), 'admin')
  ORDER BY key;
$$;

REVOKE EXECUTE ON FUNCTION public.write_audit_log(TEXT, TEXT, UUID, JSONB, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.update_club_settings(TEXT, JSONB) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_settings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.update_club_settings(TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_settings() TO authenticated;

CREATE TRIGGER audit_players AFTER INSERT OR UPDATE OR DELETE ON public.players FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_rounds AFTER INSERT OR UPDATE OR DELETE ON public.rounds FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_matches AFTER INSERT OR UPDATE OR DELETE ON public.matches FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_goals AFTER INSERT OR UPDATE OR DELETE ON public.match_goals FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_assists AFTER INSERT OR UPDATE OR DELETE ON public.match_assists FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_tournaments AFTER INSERT OR UPDATE OR DELETE ON public.tournaments FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_announcements AFTER INSERT OR UPDATE OR DELETE ON public.announcements FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_seasons AFTER INSERT OR UPDATE OR DELETE ON public.seasons FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
CREATE TRIGGER audit_goalkeeper_stats AFTER INSERT OR UPDATE OR DELETE ON public.goalkeeper_stats FOR EACH ROW EXECUTE FUNCTION public.audit_row_change();
