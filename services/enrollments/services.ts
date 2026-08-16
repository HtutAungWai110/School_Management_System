import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";

const PAGE_SIZE = 10;

const ENROLLMENT_SELECT = `
  *,
  batch_assignments (
    batches(
      batch_level(
        level_id
      )
    )
  ),
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
  batch_assignments (
    batches(
      batch_level(
        level_id
      )
    )
  ),
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

    const { data: candidates } = await supabase
      .from("profiles")
      .select(`
        id,
        batch_assignments (
          batches (
            batch_level (
              level_id
            )
          )
        ),
        student_enrollments (
          level_id
        )
      `)
      .eq("role", "student");

    const eligibleIds = (candidates ?? [])
      .filter((student) => {
        const coveredLevels = new Set(
          (student.batch_assignments ?? []).flatMap((assignment) => {
            const batches = assignment.batches as unknown as
              | { batch_level: { level_id: string }[] }
              | { batch_level: { level_id: string }[] }[]
              | null;
            const list = Array.isArray(batches) ? batches : batches ? [batches] : [];
            return list.flatMap((batch) => batch.batch_level ?? []);
          })
          .map((bl) => bl.level_id)
          .filter(Boolean)
        );

        return (student.student_enrollments ?? []).some(
          (enrollment) => enrollment.level_id && !coveredLevels.has(enrollment.level_id)
        );
      })
      .map((student) => student.id);

    let query = supabase
      .from("profiles")
      .select(levelId ? LEVEL_ENROLLMENT_SELECT : ENROLLMENT_SELECT, { count: "exact" })
      .eq("role", "student")
      .in("id", eligibleIds)
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

  static async removeManyEnrollments(studentIds: string[]) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("student_enrollments")
      .delete()
      .in("student_id", studentIds);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  static async assignToBatch(studentId: string, batchId: string) {
    const supabase = await createClient();

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('student_enrollments')
      .select(`
        id,
        student_id,
        module_id,
        level_id
        `)
      .eq("student_id", studentId);

    if (enrollmentsError) {
      throw new Error(enrollmentsError.message);
    }

    const { data: batchData, error: batchDataError } = await supabase
      .from("batches")
      .select(`
        id,
        batch_name,
        batch_level(
          level_id
        )
        `)
      .eq("id", batchId)
      .single();

    if (batchDataError) {
      throw new Error(batchDataError.message);
    }

    const studentLevelIds = new Set((enrollments ?? []).map((e) => e.level_id));
    const hasMatchingLevel = (batchData.batch_level ?? []).some((l) =>
      studentLevelIds.has(l.level_id)
    );

    if (!hasMatchingLevel) {
      throw new HttpError(400, "Student can't be assigned to this batch");
    }


    const { error } = await supabase
      .from("batch_assignments")
      .insert({ bacth_id: batchId, student_id: studentId });

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  static async assignBatch(batchId: string, studentIds: string[]) {
    return Promise.all(
      studentIds.map((studentId) => this.assignToBatch(studentId, batchId))
    );
  }
}
