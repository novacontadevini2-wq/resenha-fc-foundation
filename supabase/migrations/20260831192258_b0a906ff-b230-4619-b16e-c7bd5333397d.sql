DROP POLICY IF EXISTS player_photos_admin_insert ON storage.objects;
DROP POLICY IF EXISTS player_photos_admin_update ON storage.objects;

CREATE POLICY player_photos_admin_insert ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'player-photos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','webp'])
);

CREATE POLICY player_photos_admin_update ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'player-photos' AND public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (
  bucket_id = 'player-photos'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','webp'])
);