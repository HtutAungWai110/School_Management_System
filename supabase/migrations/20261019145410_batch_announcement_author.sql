ALTER TABLE "public"."batch_announcements"
  ADD COLUMN "author_id" uuid;

ALTER TABLE "public"."batch_announcements"
  ADD CONSTRAINT "batch_announcements_author_id_fkey" FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE SET NULL;

CREATE INDEX batch_announcements_author_id_idx ON public.batch_announcements USING btree (author_id);

CREATE POLICY "Admin Profiles Readable by All" ON "public"."profiles"
  FOR SELECT
  TO "authenticated"
  USING ((ROLE = 'admin'::public.user_role));

