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
  static async list() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("timetables")
      .select(TIMETABLE_SELECT)
      .order("day_of_week", { ascending: true })
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
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
}
