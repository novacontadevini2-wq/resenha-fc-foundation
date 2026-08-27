-- Enforce player photo constraints at the Storage boundary.
-- Client-side validation remains a UX aid, not the security boundary.
DROP POLICY IF EXISTS "player_photos_admin_insert" ON storage.objects;
DROP POLICY IF EXISTS "player_photos_admin_update" ON storage.objects;

CREATE POLICY "player_photos_admin_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'player-photos'
    AND public.has_role(auth.uid(), 'admin')
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND lower(COALESCE(metadata->>'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp')
    AND CASE
      WHEN (metadata->>'size') ~ '^[0-9]+$' THEN (metadata->>'size')::bigint
      ELSE 0
    END BETWEEN 1 AND 5242880
  );

CREATE POLICY "player_photos_admin_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'player-photos'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'player-photos'
    AND public.has_role(auth.uid(), 'admin')
    AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp')
    AND lower(COALESCE(metadata->>'mimetype', '')) IN ('image/jpeg', 'image/png', 'image/webp')
    AND CASE
      WHEN (metadata->>'size') ~ '^[0-9]+$' THEN (metadata->>'size')::bigint
      ELSE 0
    END BETWEEN 1 AND 5242880
  );
