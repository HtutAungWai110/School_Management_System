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

  static async update(id: string, description: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("levels")
      .update({ description: description.trim() })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async remove(id: string) {
    const supabase = await createClient();

    const { error: modulesLevelError } = await supabase
      .from("modules_level")
      .delete()
      .eq("level_id", id);

    if (modulesLevelError) {
      throw new Error(modulesLevelError.message);
    }

    const { error: batchLevelError } = await supabase
      .from("batch_level")
      .delete()
      .eq("level_id", id);

    if (batchLevelError) {
      throw new Error(batchLevelError.message);
    }

    const { error } = await supabase
      .from("levels")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }
}
