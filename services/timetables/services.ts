import { createClient } from "@/lib/supabase/server.client";

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
}
