-- The feed's like button asks whether the signed-in viewer already liked a
-- post. "authenticated" can insert and delete its own row, but with no SELECT
-- policy every read comes back empty and the button would always start
-- unliked. Reads stay limited to the caller's own likes; the aggregate count
-- shown on the card comes from batch_announcements.likes_count.
CREATE POLICY "Select Policy" ON "public"."batch_announcements_likes"
  FOR SELECT
  TO "authenticated"
  USING ((select auth.uid()) = profile_id);
