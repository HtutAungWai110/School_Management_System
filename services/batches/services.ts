import { createClient } from "@/lib/supabase/server.client";
import type { BatchStatus, BatchAssignment } from "@/types/batch.type";

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

    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .insert({ batch_name: batchName.trim() })
      .select()
      .single();

    if (batchError) {
      throw new Error(batchError.message);
    }

    const levelRows = levelIds.map((level_id) => ({
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
}
