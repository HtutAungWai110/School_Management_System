import { createClient } from "@/lib/supabase/server.client";

export class LevelsService {
  static async list() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("levels")
      .select(`
        id,
        description,
        created_at,
        modules_level(
          modules(
            id,
            code,
            title
          )
        )
      `);

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
