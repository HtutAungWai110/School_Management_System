import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";

const MODULES_SELECT = `
  id,
  code,
  title,
  modules_level (
    required,
    levels (
      id,
      description
    )
  )
`;

export class ModulesService {
  static async list(search: string) {
    const supabase = await createClient();

    let query = supabase
      .from("modules")
      .select(MODULES_SELECT);

    if (search) {
      query = query.ilike("title", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async update(id: string, code: string, title: string) {
    const supabase = await createClient();

    const { data: codeExist, error: codeError } = await supabase
      .from("modules")
      .select("*")
      .neq("id", id)
      .eq("code", code)
      .maybeSingle();

    if (codeError) {
      throw new Error(codeError.message);
    }

    if (codeExist) {
      throw new HttpError(400, `Another module has the same code: ${code}`);
    }

    const { data, error } = await supabase
      .from("modules")
      .update({ code, title })
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

    const { error } = await supabase
      .from("modules")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }
}
