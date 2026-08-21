import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";
import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type";

const TIMETABLE_SELECT = `
  id,
  batch_id,
  module_id,
  teacher_id,
  class_id,
  day_of_week,
  start_time,
  end_time,
  batches (
    id,
    batch_name
  ),
  modules (
    id,
    code,
    title
  ),
  profiles (
    id,
    full_name
  ),
  classes (
    id,
    class_number,
    location
  )
`;

export interface CreateTimetablePayload {
  batch_id: string;
  module_id: string;
  teacher_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
}

export class TimetablesService {
  static async list(page: number, limit: number, batchId?: string) {
    const supabase = await createClient();

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabase
      .from("timetables")
      .select(TIMETABLE_SELECT, { count: "exact" })
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (batchId) {
      query = query.eq("batch_id", batchId);
    }

    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw new Error(error.message);
    }

    return {
      timetables: data ?? [],
      totalCount: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    };
  }

  static async create(payload: CreateTimetablePayload) {
    const supabase = await createClient();

    const start = payload.start_time.slice(0, 5);
    const end = payload.end_time.slice(0, 5);

    const { data: existing, error: checkError } = await supabase
      .from("timetables")
      .select("id, day_of_week, start_time, end_time")
      .eq("class_id", payload.class_id)
      .eq("day_of_week", payload.day_of_week)
      .eq("status", "ongoing")
      .lte("start_time", end)
      .gte("end_time", start);

    if (checkError) {
      throw new Error(checkError.message);
    }

    const conflict = (existing ?? []).find(
      (slot) =>
        start < slot.end_time.slice(0, 5) && end > slot.start_time.slice(0, 5)
    );

    if (conflict) {
      throw new HttpError(
        409,
        `Class is already booked on ${DAY_OF_WEEK_LABELS[payload.day_of_week]} ${start}–${end}.`
      );
    }

    const { data: teacherConflicts, error: teacherCheckError } = await supabase
      .from("timetables")
      .select("id, day_of_week, start_time, end_time, classes(class_number)")
      .eq("teacher_id", payload.teacher_id)
      .eq("day_of_week", payload.day_of_week)
      .eq("status", "ongoing")
      .lte("start_time", end)
      .gte("end_time", start);

    if (teacherCheckError) {
      throw new Error(teacherCheckError.message);
    }

    const teacherConflict = (teacherConflicts ?? []).find(
      (slot) => start < slot.end_time.slice(0, 5) && end > slot.start_time.slice(0, 5)
    );

    if (teacherConflict) {
      const classInfo = (teacherConflict.classes as unknown as { class_number: string | null } | null);
      throw new HttpError(
        409,
        `Teacher is already scheduled on ${DAY_OF_WEEK_LABELS[payload.day_of_week]} ${start}–${end}${classInfo?.class_number ? ` in Class ${classInfo.class_number}` : ""}.`
      );
    }

    const { data: batchConflicts, error: batchCheckError } = await supabase
      .from("timetables")
      .select("id, day_of_week, start_time, end_time, modules(code, title)")
      .eq("batch_id", payload.batch_id)
      .eq("day_of_week", payload.day_of_week)
      .eq("status", "ongoing")
      .lte("start_time", end)
      .gte("end_time", start);

    if (batchCheckError) {
      throw new Error(batchCheckError.message);
    }

    const batchConflict = (batchConflicts ?? []).find(
      (slot) => start < slot.end_time.slice(0, 5) && end > slot.start_time.slice(0, 5)
    );

    if (batchConflict) {
      const mod = batchConflict.modules as unknown as { code: string; title: string } | null;
      throw new HttpError(
        409,
        `Batch already has a session on ${DAY_OF_WEEK_LABELS[payload.day_of_week]} ${start}–${end}${mod ? ` (${mod.code} · ${mod.title})` : ""}.`
      );
    }

    const { data, error } = await supabase
      .from("timetables")
      .insert(payload)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async remove(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
      .from("timetables")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  static async update(
    id: string,
    payload: { class_id?: string; day_of_week?: number; start_time?: string; end_time?: string }
  ) {
    const supabase = await createClient();

    const { data: existing, error: fetchError } = await supabase
      .from("timetables")
      .select("class_id, day_of_week, start_time, end_time, status, teacher_id, batch_id")
      .eq("id", id)
      .single();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!existing) {
      throw new HttpError(404, "Timetable not found.");
    }

    if (existing.status !== "ongoing") {
      throw new HttpError(400, "Only ongoing timetables can be edited.");
    }

    const classId = payload.class_id ?? existing.class_id;
    const dayOfWeek = payload.day_of_week ?? existing.day_of_week;
    const start = (payload.start_time ?? existing.start_time).slice(0, 5);
    const end = (payload.end_time ?? existing.end_time).slice(0, 5);

    if (end <= start) {
      throw new HttpError(400, "End time must be after start time.");
    }

    const { data: conflicts, error: checkError } = await supabase
      .from("timetables")
      .select("id, day_of_week, start_time, end_time")
      .eq("class_id", classId)
      .eq("day_of_week", dayOfWeek)
      .eq("status", "ongoing")
      .neq("id", id)
      .lte("start_time", end)
      .gte("end_time", start);

    if (checkError) {
      throw new Error(checkError.message);
    }

    const conflict = (conflicts ?? []).find(
      (slot) => start < slot.end_time.slice(0, 5) && end > slot.start_time.slice(0, 5)
    );

    if (conflict) {
      throw new HttpError(
        409,
        `Class is already booked on ${DAY_OF_WEEK_LABELS[dayOfWeek]} ${start}–${end}.`
      );
    }

    const { data: teacherConflicts, error: teacherCheckError } = await supabase
      .from("timetables")
      .select("id, day_of_week, start_time, end_time, classes(class_number)")
      .eq("teacher_id", existing.teacher_id)
      .eq("day_of_week", dayOfWeek)
      .eq("status", "ongoing")
      .neq("id", id)
      .lte("start_time", end)
      .gte("end_time", start);

    if (teacherCheckError) {
      throw new Error(teacherCheckError.message);
    }

    const teacherConflict = (teacherConflicts ?? []).find(
      (slot) => start < slot.end_time.slice(0, 5) && end > slot.start_time.slice(0, 5)
    );

    if (teacherConflict) {
      const classInfo = (teacherConflict.classes as unknown as { class_number: string | null } | null);
      throw new HttpError(
        409,
        `Teacher is already scheduled on ${DAY_OF_WEEK_LABELS[dayOfWeek]} ${start}–${end}${classInfo?.class_number ? ` in Class ${classInfo.class_number}` : ""}.`
      );
    }

    const { data: batchConflicts, error: batchCheckError } = await supabase
      .from("timetables")
      .select("id, day_of_week, start_time, end_time, modules(code, title)")
      .eq("batch_id", existing.batch_id)
      .eq("day_of_week", dayOfWeek)
      .eq("status", "ongoing")
      .neq("id", id)
      .lte("start_time", end)
      .gte("end_time", start);

    if (batchCheckError) {
      throw new Error(batchCheckError.message);
    }

    const batchConflict = (batchConflicts ?? []).find(
      (slot) => start < slot.end_time.slice(0, 5) && end > slot.start_time.slice(0, 5)
    );

    if (batchConflict) {
      const mod = batchConflict.modules as unknown as { code: string; title: string } | null;
      throw new HttpError(
        409,
        `Batch already has a session on ${DAY_OF_WEEK_LABELS[dayOfWeek]} ${start}–${end}${mod ? ` (${mod.code} · ${mod.title})` : ""}.`
      );
    }

    const updatePayload: Record<string, unknown> = {};
    if (payload.class_id !== undefined) updatePayload.class_id = classId;
    if (payload.day_of_week !== undefined) updatePayload.day_of_week = dayOfWeek;
    if (payload.start_time !== undefined) updatePayload.start_time = payload.start_time;
    if (payload.end_time !== undefined) updatePayload.end_time = payload.end_time;

    if (Object.keys(updatePayload).length === 0) {
      throw new HttpError(400, "Nothing to update.");
    }

    const { data, error } = await supabase
      .from("timetables")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async getTeacherAvailability(teacherId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("timetables")
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        modules (
          id,
          code,
          title
        ),
        batches(
          id,
          batch_name
        ),
        classes(
          id,
          class_number,
          location
        ),
        status
      `)
      .eq("teacher_id", teacherId)
      .eq("status", "ongoing")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  static async getClassAvailability(classId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("timetables")
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        modules (
          id,
          code,
          title
        ),
        batches(
          id,
          batch_name
        ),
        profiles(
          id,
          full_name
        ),
        status
      `)
      .eq("class_id", classId)
      .eq("status", "ongoing")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  static async getBatchAvailability(batchId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("timetables")
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        modules (
          id,
          code,
          title
        ),
        profiles(
          id,
          full_name
        ),
        classes(
          id,
          class_number,
          location
        ),
        status
      `)
      .eq("batch_id", batchId)
      .eq("status", "ongoing")
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }
}
