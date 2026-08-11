import { createClient } from "@/lib/supabase/server.client";

const BATCH_SELECT = `
  id,
  batch_name,
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
      avatar_url,
      student_enrollments(
        modules(
          id,
          code,
          title
        )
      )
    )
  )
`;

export class BatchesService {
  static async list(search: string) {
    const supabase = await createClient();

    let query = supabase
      .from("batches")
      .select(BATCH_SELECT)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("batch_name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data ?? [];
  }

  static async getById(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("batches")
      .select(BATCH_DETAIL_SELECT)
      .eq("id", id)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
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

  static async update(id: string, batchName: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("batches")
      .update({ batch_name: batchName })
      .eq("id", id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return data;
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
      .eq("bacth_id", id);

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
