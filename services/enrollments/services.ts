import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";
import { NotificationsService } from "@/services/notifications/services";
import type { EnrolledStudent } from "@/types/enrollment.type";

const PAGE_SIZE = 10;

const ENROLLMENT_SELECT = `
  *,
  student_enrollments!inner (
    id,
    enrolled_at,
    level_id,
    status,
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
  static async list(search: string, filter: string, page: number, id?: string) {
    const supabase = await createClient();

    const levelId = filter;

    let query = supabase
      .from("profiles")
      .select(ENROLLMENT_SELECT, { count: "exact" })
      .eq("role", "student")
      .eq("student_enrollments.status", "unassigned")
      .order("created_at", { ascending: false });

    if (id) {
      /* Matches the student id only. This previously also accepted a
         student_enrollments id via
         `.or(\`id.eq.X,student_enrollments.id.eq.X\`)`, but PostgREST rejects
         that outright — `or` cannot reference an embedded table's column:
         "unexpected \"i\" expecting \"not\" or operator" (PGRST100). Every
         request carrying ?id= came back 400, which the page rendered as an
         empty list because it never checked the status. */
      query = query.eq("id", id);
    }

    if (search) {
      query = query.ilike("full_name", `%${search}%`);
    }

    if (levelId) {
      query = query.eq("student_enrollments.level_id", levelId);
    }

    const { data: raw, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    let enrollmentCountQuery = supabase
      .from("student_enrollments")
      .select("*", { count: "exact", head: true })
      .eq("status", "unassigned");

    if (levelId) {
      enrollmentCountQuery = enrollmentCountQuery.eq("level_id", levelId);
    }

    const { count: totalEnrollments } = await enrollmentCountQuery;

    const flattenByLevel = (student: Omit<EnrolledStudent, "student_enrollments"> & { student_enrollments: EnrolledStudent["student_enrollments"] }): EnrolledStudent[] => {
      const enrollments = student.student_enrollments ?? [];
      const levelMap = new Map<string, EnrolledStudent["student_enrollments"]>();

      for (const e of enrollments) {
        if (!e.level_id) continue;
        const existing = levelMap.get(e.level_id);
        if (existing) {
          existing.push(e);
        } else {
          levelMap.set(e.level_id, [e]);
        }
      }

      if (levelMap.size === 0) {
        return [{ ...student, student_enrollments: [] }];
      }

      return Array.from(levelMap.values()).map((enrollments) => ({
        ...student,
        student_enrollments: enrollments,
      }));
    };

    const flat = (raw ?? []).flatMap((student) => flattenByLevel(student));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE;
    const paginated = flat.slice(from, to);

    return {
      enrollments: paginated,
      totalCount: flat.length,
      totalEnrollments: totalEnrollments ?? 0,
      page,
      totalPages: Math.ceil(flat.length / PAGE_SIZE),
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

  static async assignToBatch(studentId: string, batchId: string, moduleIds: string[]) {
    const supabase = await createClient();

    const { data: studentData, error: studentError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", studentId)
      .maybeSingle();

    if (studentError) {
      throw new Error(studentError.message);
    }

    if (!studentData) {
      throw new HttpError(404, "Student not found");
    }

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
      .maybeSingle();

    if (batchDataError) {
      throw new Error(batchDataError.message);
    }

    if (!batchData) {
      throw new HttpError(404, "Batch not found");
    }

    if (moduleIds.length > 0) {
      const { data: existingModules, error: modulesError } = await supabase
        .from("modules")
        .select("id")
        .in("id", moduleIds);

      if (modulesError) {
        throw new Error(modulesError.message);
      }

      const validModuleIds = new Set((existingModules ?? []).map((m) => m.id));
      const hasInvalidModules = moduleIds.some((moduleId) => !validModuleIds.has(moduleId));

      if (hasInvalidModules) {
        throw new HttpError(400, "Invalid module provided");
      }
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
      .insert({ batch_id: batchId, student_id: studentId });

    if (error) {
      throw new Error(error.message);
    }

    /* Announced only once this student's own row exists. assignBatch runs the
       students in parallel, so an earlier failure elsewhere in the batch must
       not stop the ones that did land from being told. */
    try {
      await NotificationsService.notifyStudentOfBatchAssignment({
        studentId,
        batchId,
        batchName: batchData.batch_name ?? "",
      });
    } catch (notifyError) {
      console.error("[notifications] batch assignment failed:", notifyError);
    }

    if (moduleIds.length > 0) {
      const { error: updateError } = await supabase
        .from("student_enrollments")
        .update({ status: "assigned" })
        .eq("student_id", studentId)
        .in("module_id", moduleIds);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return { success: true };
  }

  static async assignBatch(batchId: string, studentModuleMap: Map<string, string[]>) {
    return Promise.all(
      Array.from(studentModuleMap.entries()).map(([studentId, moduleIds]) =>
        this.assignToBatch(studentId, batchId, moduleIds)
      )
    );
  }
}
