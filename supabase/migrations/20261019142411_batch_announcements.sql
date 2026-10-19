SET local check_function_bodies = off;

CREATE TABLE "public"."batch_announcements_comments" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "profile_id"      uuid                     NOT NULL,
  "announcement_id" uuid                     NOT NULL,
  "created_at"      timestamp with time zone DEFAULT now(),
  "parent_id"       uuid,
  CONSTRAINT "batch_announcements_comments_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."batch_announcements_comments"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."batch_announcements_likes" (
  "id"              uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "profile_id"      uuid                     NOT NULL,
  "announcement_id" uuid                     NOT NULL,
  "created_at"      timestamp with time zone DEFAULT now(),
  CONSTRAINT "batch_announcements_likes_pkey" PRIMARY KEY (id),
  CONSTRAINT "batch_announcements_likes_profile_announcement_key" UNIQUE (announcement_id, profile_id)
);

ALTER TABLE "public"."batch_announcements_likes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."batch_announcements" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "batch_id"       uuid                     NOT NULL,
  "created_at"     timestamp with time zone DEFAULT now(),
  "updated_at"     timestamp with time zone DEFAULT now(),
  "content"        text,
  "attachments"    jsonb,
  "likes_count"    integer                  NOT NULL DEFAULT 0,
  "comments_count" integer                  NOT NULL DEFAULT 0,
  CONSTRAINT "batch_announcements_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."batch_announcements"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.sync_announcement_comments_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  case tg_op
    when 'INSERT' then
      update public.batch_announcements
         set comments_count = coalesce(comments_count, 0) + 1
       where id = new.announcement_id;
      return new;

    when 'DELETE' then
      update public.batch_announcements
         set comments_count = greatest(coalesce(comments_count, 0) - 1, 0)
       where id = old.announcement_id;
      return old;

    when 'UPDATE' then
      if old.announcement_id is distinct from new.announcement_id then
        update public.batch_announcements
           set comments_count = greatest(coalesce(comments_count, 0) - 1, 0)
         where id = old.announcement_id;
        update public.batch_announcements
           set comments_count = coalesce(comments_count, 0) + 1
         where id = new.announcement_id;
      end if;
      return new;
  end case;
end;
$function$;

CREATE OR REPLACE FUNCTION public.sync_announcement_likes_count()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
begin
  case tg_op
    when 'INSERT' then
      update public.batch_announcements
         set likes_count = coalesce(likes_count, 0) + 1
       where id = new.announcement_id;
      return new;

    when 'DELETE' then
      update public.batch_announcements
         set likes_count = greatest(coalesce(likes_count, 0) - 1, 0)
       where id = old.announcement_id;
      return old;

    when 'UPDATE' then
      if old.announcement_id is distinct from new.announcement_id then
        update public.batch_announcements
           set likes_count = greatest(coalesce(likes_count, 0) - 1, 0)
         where id = old.announcement_id;
        update public.batch_announcements
           set likes_count = coalesce(likes_count, 0) + 1
         where id = new.announcement_id;
      end if;
      return new;
  end case;
end;
$function$;

ALTER TABLE "public"."batch_announcements"
  ADD CONSTRAINT "batch_announcements_batch_id_fkey" FOREIGN KEY (batch_id) REFERENCES public.batches(id);

ALTER TABLE "public"."batch_announcements_comments"
  ADD CONSTRAINT "batch_announcements_comments_announcement_id_fkey" FOREIGN KEY (announcement_id) REFERENCES public.batch_announcements(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."batch_announcements_comments"
  ADD CONSTRAINT "batch_announcements_comments_parent_id_fkey" FOREIGN KEY (parent_id) REFERENCES public.batch_announcements_comments(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."batch_announcements_comments"
  ADD CONSTRAINT "batch_announcements_comments_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."batch_announcements_likes"
  ADD CONSTRAINT "batch_announcements_likes_announcement_id_fkey" FOREIGN KEY (announcement_id) REFERENCES public.batch_announcements(id) ON UPDATE CASCADE ON DELETE CASCADE;

ALTER TABLE "public"."batch_announcements_likes"
  ADD CONSTRAINT "batch_announcements_likes_profile_id_fkey" FOREIGN KEY (profile_id) REFERENCES public.profiles(id);

CREATE INDEX batch_announcements_comments_parent_id_idx ON public.batch_announcements_comments USING btree (parent_id);

CREATE INDEX idx_batch_announcements_comments_announcement_id ON public.batch_announcements_comments USING btree (announcement_id);

CREATE INDEX idx_batch_announcements_comments_profile_id_announcement_id ON public.batch_announcements_comments USING btree (profile_id, announcement_id);

CREATE INDEX idx_batch_announcements_comments_profile_id ON public.batch_announcements_comments USING btree (profile_id);

CREATE INDEX idx_batch_announcements_likes_announcement_id ON public.batch_announcements_likes USING btree (announcement_id);

CREATE INDEX idx_batch_announcements_likes_profile_id_announcement_id ON public.batch_announcements_likes USING btree (profile_id, announcement_id);

CREATE INDEX idx_batch_announcements_likes_profile_id ON public.batch_announcements_likes USING btree (profile_id);

CREATE TRIGGER batch_announcements_comments_count
  AFTER INSERT OR DELETE OR UPDATE OF announcement_id ON public.batch_announcements_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_announcement_comments_count();

CREATE TRIGGER batch_announcements_likes_count
  AFTER INSERT OR DELETE OR UPDATE OF announcement_id ON public.batch_announcements_likes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_announcement_likes_count();

CREATE POLICY "Student Policy" ON "public"."batch_announcements"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_student() AND (EXISTS ( SELECT 1
   FROM public.batch_assignments
  WHERE ((batch_assignments.student_id = auth.uid()) AND (batch_assignments.batch_id = batch_announcements.batch_id))))));

CREATE POLICY "Teacher Policy" ON "public"."batch_announcements"
  FOR SELECT
  TO "authenticated"
  USING ((public.is_teacher() AND (EXISTS ( SELECT 1
   FROM public.timetables
  WHERE ((timetables.teacher_id = auth.uid()) AND (timetables.batch_id = batch_announcements.batch_id))))));

CREATE POLICY "is_admin" ON "public"."batch_announcements"
  FOR ALL
  TO "authenticated"
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Delete Policy" ON "public"."batch_announcements_comments"
  FOR DELETE
  TO "authenticated"
  USING ((auth.uid() = profile_id));

CREATE POLICY "Insert Policy" ON "public"."batch_announcements_comments"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = profile_id));

CREATE POLICY "Delete Policy" ON "public"."batch_announcements_likes"
  FOR DELETE
  TO "authenticated"
  USING ((auth.uid() = profile_id));

CREATE POLICY "Insert Policy" ON "public"."batch_announcements_likes"
  FOR INSERT
  TO "authenticated"
  WITH CHECK ((auth.uid() = profile_id));

REVOKE ALL ON FUNCTION "public"."sync_announcement_comments_count"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."sync_announcement_comments_count"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."sync_announcement_comments_count"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."sync_announcement_comments_count"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."sync_announcement_comments_count"() TO "service_role";

REVOKE ALL ON FUNCTION "public"."sync_announcement_likes_count"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "public"."sync_announcement_likes_count"() TO "anon", "authenticated";

REVOKE ALL ON FUNCTION "public"."sync_announcement_likes_count"() FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."sync_announcement_likes_count"() TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."sync_announcement_likes_count"() TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."batch_announcements" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."batch_announcements" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."batch_announcements" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."batch_announcements" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."batch_announcements_comments" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."batch_announcements_comments" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."batch_announcements_comments" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."batch_announcements_comments" TO "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."batch_announcements_likes" TO "anon", "authenticated";

REVOKE ALL ON TABLE "public"."batch_announcements_likes" FROM "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."batch_announcements_likes" TO "postgres";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."batch_announcements_likes" TO "service_role";

