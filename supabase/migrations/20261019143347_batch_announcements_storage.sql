-- Bucket rows are data, not schema, so `db diff` cannot capture them. Created
-- here so a fresh environment does not apply these policies to a bucket that
-- was never created.
INSERT INTO "storage"."buckets" (id, name, public, allowed_mime_types)
VALUES ('batch_announcements', 'batch_announcements', true, ARRAY['image/*'])
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Batch Announcements Admin Delete" ON "storage"."objects"
  FOR DELETE
  TO "authenticated"
  USING (((bucket_id = 'batch_announcements'::text) AND ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY "Batch Announcements Admin Insert" ON "storage"."objects"
  FOR INSERT
  TO "authenticated"
  WITH CHECK (((bucket_id = 'batch_announcements'::text) AND ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY "Batch Announcements Admin Update" ON "storage"."objects"
  FOR UPDATE
  TO "authenticated"
  USING (((bucket_id = 'batch_announcements'::text) AND ( SELECT public.is_admin() AS is_admin)))
  WITH CHECK (((bucket_id = 'batch_announcements'::text) AND ( SELECT public.is_admin() AS is_admin)));

CREATE POLICY "Batch Announcements Authenticated Read" ON "storage"."objects"
  FOR SELECT
  TO "authenticated"
  USING ((bucket_id = 'batch_announcements'::text));
