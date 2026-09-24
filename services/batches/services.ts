import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";
import type { BatchStatus, BatchAssignment, BatchModule, BatchTeacherModule, Assignment } from "@/types/batch.type";

const BATCH_SELECT = `
  id,
  batch_name,
  status,
  created_at,
  batch_level (
    id,
    level_id,
    levels (
      id,
      description
    )
  ),
  batch_assignments (
    id,
    student_id,
    assigned_at,
    profiles (
      id,
      full_name,
      email,
      avatar_url
    )
  )
`;

const BATCH_DETAIL_SELECT = `
  id,
  batch_name,
  status,
  created_at,
  batch_level (
    id,
    level_id,
    levels (
      id,
      description
    )
  ),
  timetables(
    id,
    day_of_week,
    start_time,
    end_time,
    status,
    modules(
      id,
      code,
      title
    ),
    profiles(
      id,
      full_name,
      email,
      avatar_url
    ),
    classes(
      id,
      class_number,
      location
    )
  )
`;

const STUDENT_ENROLLMENTS_SELECT = `
  id,
  student_id,
  assigned_at,
  profiles (
    id,
    full_name,
    email,
    avatar_url,
    student_enrollments(
      id,
      level_id,
      modules(
        id,
        code,
        title
      )
    )
  )
`;

export class BatchesService {
  static async list(search: string, status: string) {
    const supabase = await createClient();

    let query = supabase
      .from("batches")
      .select(BATCH_SELECT)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("batch_name", `%${search}%`);
    }

    if (status === "ongoing" || status === "completed") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  static async getById(id: string) {
    const supabase = await createClient();

    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select(BATCH_DETAIL_SELECT)
      .eq("id", id)
      .single();

    if (batchError) {
      throw new Error(batchError.message);
    }

    const batchLevelIds = new Set((batch.batch_level ?? []).map((bl) => bl.level_id));

    if (batchLevelIds.size > 0) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("batch_assignments")
        .select(STUDENT_ENROLLMENTS_SELECT)
        .eq("batch_id", id);

      if (assignmentsError) {
        throw new Error(assignmentsError.message);
      }

      const filteredAssignments = (assignments ?? []).map((assignment: { id: string; student_id: string; assigned_at: string; profiles: unknown }) => {
        const profile = assignment.profiles as { id: string; full_name: string; email: string; avatar_url: string | null; student_enrollments: { level_id: string }[] } | null;
        if (!profile) return assignment;

        const filteredEnrollments = (profile.student_enrollments ?? []).filter(
          (enrollment: { level_id: string }) => batchLevelIds.has(enrollment.level_id)
        );

        return {
          ...assignment,
          profiles: {
            ...profile,
            student_enrollments: filteredEnrollments,
          },
        } as BatchAssignment;
      });

      return {
        ...batch,
        batch_assignments: filteredAssignments,
      };
    }

    return batch;
  }

  static async create(batchName: string, levelIds: string[]) {
    const supabase = await createClient();

    const uniqueLevelIds = [...new Set(levelIds)];

    const { data: existingLevels, error: levelsCheckError } = await supabase
      .from("levels")
      .select("id")
      .in("id", uniqueLevelIds);

    if (levelsCheckError) {
      throw new Error(levelsCheckError.message);
    }

    if ((existingLevels ?? []).length !== uniqueLevelIds.length) {
      throw new HttpError(400, "Invalid level provided");
    }

    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .insert({ batch_name: batchName.trim() })
      .select()
      .single();

    if (batchError) {
      throw new Error(batchError.message);
    }

    const levelRows = uniqueLevelIds.map((level_id) => ({
      level_id,
      batch_id: batch.id,
    }));

    const { error: levelsError } = await supabase.from("batch_level").insert(levelRows);

    if (levelsError) {
      await supabase.from("batches").delete().eq("id", batch.id);
      throw new Error(levelsError.message);
    }

    return batch;
  }

  static async update(id: string, payload: { batch_name?: string; status?: BatchStatus }) {
    const supabase = await createClient();

    const changes: Record<string, string> = {};
    if (payload.batch_name !== undefined) changes.batch_name = payload.batch_name.trim();
    if (payload.status !== undefined) changes.status = payload.status;

    const { data, error } = await supabase
      .from("batches")
      .update(changes)
      .eq("id", id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async removeAssignment(assignmentId: string, batchId: string) {
    const supabase = await createClient();

    const { data: assignment, error: assignmentError } = await supabase
      .from("batch_assignments")
      .select("student_id")
      .eq("id", assignmentId)
      .single();

    if (assignmentError) {
      throw new Error(assignmentError.message);
    }

    const { data: batchData, error: batchError } = await supabase
      .from("batches")
      .select(`
        id,
        batch_level(
          level_id
        )
      `)
      .eq("id", batchId)
      .single();

    if (batchError) {
      throw new Error(batchError.message);
    }

    const batchLevelIds = (batchData.batch_level ?? []).map((bl) => bl.level_id);

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("student_enrollments")
      .select("module_id")
      .eq("student_id", assignment.student_id)
      .in("level_id", batchLevelIds);

    if (enrollmentsError) {
      throw new Error(enrollmentsError.message);
    }

    const moduleIds = (enrollments ?? []).map((e) => e.module_id);

    const { error } = await supabase
      .from("batch_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      throw new Error(error.message);
    }

    if (moduleIds.length > 0) {
      const { error: updateError } = await supabase
        .from("student_enrollments")
        .update({ status: "unassigned" })
        .eq("student_id", assignment.student_id)
        .in("module_id", moduleIds);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return { success: true };
  }

  static async bulkRemoveAssignments(assignmentIds: string[], batchId: string) {
    for (const assignmentId of assignmentIds) {
      await this.removeAssignment(assignmentId, batchId);
    }

    return { success: true, removed: assignmentIds.length };
  }

  static async remove(id: string) {
    const supabase = await createClient();

    const { error: levelsError } = await supabase
      .from("batch_level")
      .delete()
      .eq("batch_id", id);

    if (levelsError) {
      throw new Error(levelsError.message);
    }

    const { error: assignmentsError } = await supabase
      .from("batch_assignments")
      .delete()
      .eq("batch_id", id);

    if (assignmentsError) {
      throw new Error(assignmentsError.message);
    }

    const { error } = await supabase
      .from("batches")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  static async getBatchModules(
    batchId: string
  ): Promise<BatchModule[]> {
    const supabase = await createClient();

    const { data: batchLevelData, error: batchLevelError } = await supabase
      .from("batch_level")
      .select("level_id, batch_id")
      .eq("batch_id", batchId);

    if (batchLevelError) {
      throw new Error(batchLevelError.message);
    }

    const { data: batchModulesData, error: batchModulesError } = await supabase
      .from("batch_assignments")
      .select(`
        batch_id,
        profiles(
          student_enrollments(
            module_id,
            level_id,
            modules(
              id,
              code,
              title
            )
          )
        )
      `)
      .eq("batch_id", batchId);

    if (batchModulesError) {
      throw new Error(batchModulesError.message);
    }

    const batchLevelIds = new Set(batchLevelData.map((item) => item.level_id));
    const moduleIds = new Set<string>();
    const modules: BatchModule[] = [];

    const flatModules = (batchModulesData ?? []).flatMap(
      (item) => (item.profiles as unknown as { student_enrollments: { module_id: string; level_id: string; modules: BatchModule | null }[] } | null)?.student_enrollments ?? []
    );

    for (const enrollment of flatModules) {
      if (batchLevelIds.has(enrollment.level_id) && !moduleIds.has(enrollment.module_id) && enrollment.modules) {
        moduleIds.add(enrollment.module_id);
        modules.push(enrollment.modules);
      }
    }

    return modules;
  }
  static async getTeacherModules(
    batchId: string
  ): Promise<BatchTeacherModule[]> {
    const supabase = await createClient();


    const { data: batchModulesData, error: batchModulesError } = await supabase
      .from("batch_level")
      .select(`
        batch_id,
        levels(
          modules_level(
            modules(
              id,
              code,
              title
            )
          )
        )
      `)
      .eq("batch_id", batchId);

    if (batchModulesError) {
      throw new Error(batchModulesError.message);
    }

    const flatIds = Array.from(
      new Set(
        (batchModulesData ?? [])
          .flatMap((item) => (item.levels as unknown as { modules_level: { modules: { id: string } | null }[] | null } | null)?.modules_level ?? [])
          .map((moduleLevel) => moduleLevel.modules?.id)
          .filter((moduleId): moduleId is string => Boolean(moduleId))
      )
    );

    if (flatIds.length === 0) {
      return [];
    }

    const {data: teacherModules, error: teacherModulesError} = await supabase
      .from("teacher_modules")
      .select(`
        profiles(
          id,
          full_name,
          email
        ),
        modules(
          id,
          code,
          title
        )
      `)
      .in("module_id", flatIds);

    if (teacherModulesError) {
      throw new Error(teacherModulesError.message);
    }

    return (teacherModules ?? []) as unknown as BatchTeacherModule[];

  }

  static async getStudents(batchId: string, moduleId: string): Promise<string[]> {
    const supabase = await createClient();

    const { data: batchStudentsData, error: batchStudentsError } = await supabase
      .from("batch_assignments")
      .select("profiles(id)")
      .eq("batch_id", batchId);

    if (batchStudentsError) throw batchStudentsError;

    const studentIds = batchStudentsData
      .map((item) => (item.profiles as unknown as { id: string } | null)?.id)
      .filter((id): id is string => Boolean(id));

    const { data: targetStudentsData, error: targetStudentsError } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .in("student_id", studentIds)
      .eq("module_id", moduleId)
      .eq("status", "assigned");

    if (targetStudentsError) throw targetStudentsError;

    return targetStudentsData.map((item) => item.student_id);
  }

  static async getStudentCount(batchId: string, moduleId: string): Promise<number>{
    const students = await this.getStudents(batchId, moduleId)
    const studentCount = students.length
    return studentCount;
  }

  static async createAssignment(
    batchId: string,
    moduleId: string,
    teacherId: string,
    deadlineAt: string | null = null
  ) {
    const supabase = await createClient();

    const { data: timetableData, error: timetableError } = await supabase
      .from("timetables")
      .select("id")
      .eq("batch_id", batchId)
      .eq("module_id", moduleId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (timetableError) {
      throw new Error(timetableError.message);
    }

    if (!timetableData) {
      throw new HttpError(400, "No timetable entry found for this batch, module, and teacher");
    }

    const { data, error } = await supabase
      .from("assignments")
      .insert({
        batch_id: batchId,
        module_id: moduleId,
        teacher_id: teacherId,
        deadline_at: deadlineAt,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async getAssignments(batchId: string): Promise<Assignment[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("assignments")
      .select(`
        id,
        batch_id,
        module_id,
        teacher_id,
        created_at,
        deadline_at,
        modules (
          id,
          code,
          title
        ),
        profiles (
          id,
          full_name,
          email,
          phone
        ),
        student_assignments (
          id,
          assignment_id,
          student_id,
          turned_in_at,
          file_path,
          file_name,
          profiles (
            id,
            full_name,
            email,
            phone
          )
        )
      `)
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as unknown as Assignment[];
  }
}
