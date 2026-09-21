DROP POLICY IF EXISTS club_settings_admin_read ON public.club_settings;
CREATE POLICY club_settings_read ON public.club_settings FOR SELECT TO authenticated USING (true);