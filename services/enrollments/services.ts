import { createClient } from "@/lib/supabase/server.client";

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

export class EnrollmentsService {
  static async list(search: string, filter: string, page: number) {
    const supabase = await createClient();

    const levelId = filter;

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
      throw new Error(error.message);
    }

    const totalCount = count ?? 0;

    return {
      enrollments,
      totalCount,
      totalEnrollments: totalEnrollments ?? 0,
      page,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    };
  }

  static async removeEnrollments(studentId: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("student_enrollments")
      .delete()
      .eq("student_id", studentId);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  static async assignToBatch(studentId: string, batchId: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("batch_assignments")
      .insert({ bacth_id: batchId, student_id: studentId });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }
}
