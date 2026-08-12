import { createClient } from "@/lib/supabase/server.client";

export class ClassesService {
  static async list() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("classes")
      .select("id, class_number, location")
      .order("class_number", { ascending: true, nullsFirst: true });

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }
}
