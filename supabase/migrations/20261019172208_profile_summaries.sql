SET local check_function_bodies = off;

DROP POLICY "Admin Profiles Readable by All" ON "public"."profiles";

CREATE OR REPLACE FUNCTION public.get_profile_summaries (
  p_ids uuid[]
)
  RETURNS TABLE (
    id         uuid,
    full_name  text,
    avatar_url text
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
  select p.id, p.full_name, p.avatar_url
  from public.profiles p
  where p.id = any(p_ids);
$function$;

REVOKE ALL ON FUNCTION "public"."get_profile_summaries"(uuid[]) FROM PUBLIC, "anon";

GRANT EXECUTE ON FUNCTION "public"."get_profile_summaries"(uuid[]) TO "authenticated";

REVOKE ALL ON FUNCTION "public"."get_profile_summaries"(uuid[]) FROM "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_profile_summaries"(uuid[]) TO "postgres";

GRANT EXECUTE ON FUNCTION "public"."get_profile_summaries"(uuid[]) TO "service_role";

