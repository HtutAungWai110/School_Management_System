-- Comments are readable by anyone who can see the announcement. The EXISTS
-- runs under the caller's RLS, so the student/teacher batch rules carry over
-- instead of being restated here.
CREATE POLICY "Select Policy" ON "public"."batch_announcements_comments"
  FOR SELECT
  TO "authenticated"
  USING (
    EXISTS (
      SELECT 1
      FROM public.batch_announcements a
      WHERE a.id = batch_announcements_comments.announcement_id
    )
  );

-- Every page filters by announcement and sorts by (created_at, id). The
-- composite replaces the single-column index, whose leftmost prefix it covers.
CREATE INDEX batch_announcements_comments_announcement_created_idx
  ON public.batch_announcements_comments USING btree (announcement_id, created_at, id);

DROP INDEX public.idx_batch_announcements_comments_announcement_id;
