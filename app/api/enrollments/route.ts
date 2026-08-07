import { createClient } from "@/lib/supabase/server.client";
import { NextRequest, NextResponse } from "next/server";

const PAGE_SIZE = 10;

const ENROLLMENT_SELECT = `
  *,
  batch_assignments (),
  student_enrollments (
    id,
    enrolled_at,
    level_id,
    levels (
      id,
      description
    ),
    modules (
      id,
      code,
      title
    )
  )
`;

const LEVEL_ENROLLMENT_SELECT = `
  *,
  batch_assignments (),
  student_enrollments!inner (
    id,
    enrolled_at,
    level_id,
    levels (
      id,
      description
    ),
    modules (
      id,
      code,
      title
    )
  )
`;

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const params = request.nextUrl.searchParams;
  const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
  const search = params.get("search") ?? "";
  const levelId = params.get("filter") ?? "";

  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  let query = supabase
    .from("profiles")
    .select(levelId ? LEVEL_ENROLLMENT_SELECT : ENROLLMENT_SELECT, { count: "exact" })
    .eq("role", "student")
    .is("batch_assignments", null)
    .range(from, to)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  if (levelId) {
    query = query.eq("student_enrollments.level_id", levelId);
  }

  const { data: enrollments, error, count } = await query;

  let enrollmentCountQuery = supabase
    .from("student_enrollments")
    .select("*", { count: "exact", head: true });

  if (levelId) {
    enrollmentCountQuery = enrollmentCountQuery.eq("level_id", levelId);
  }

  const { count: totalEnrollments } = await enrollmentCountQuery;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const totalCount = count ?? 0;

  return NextResponse.json({
    enrollments,
    totalCount,
    totalEnrollments: totalEnrollments ?? 0,
    page,
    totalPages: Math.ceil(totalCount / PAGE_SIZE),
  });
}
