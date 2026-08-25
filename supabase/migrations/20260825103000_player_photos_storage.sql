INSERT INTO storage.buckets (id, name, public)
VALUES ('player-photos', 'player-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

CREATE POLICY "player_photos_public_read" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'player-photos');

CREATE POLICY "player_photos_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "player_photos_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "player_photos_admin_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'));
