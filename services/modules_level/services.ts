
import type { Module } from "@/types/module.type";
import { createClient } from "@/lib/supabase/server.client";

export async function updateModulesLevel(
  id: string,
  payload: Array<{ level_id: string; required: string }>
) {
  const supabase = await createClient();

  // 1. Fetch current module configuration
  const { data, error } = await supabase
    .from("modules")
    .select(`
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
    `)
    .eq("id", id)
    .single();

  if (error || !data) {
    throw new Error(`Failed to fetch module: ${error?.message}`);
  }

  const modules = data as unknown as Module;

  if (payload.length === 0) {
    const { data: deleteData, error: deleteError } = await supabase.from("modules_level").delete().eq("module_id", id);
    if (deleteError) throw new Error(`Failed to delete modules level: ${deleteError?.message}`);
    return { updateResults: "none", deleteResults: deleteData };
  }

  // 2. Handle updates and inserts
  const updatePromises = payload.map((p) => {
    // Return explicit comparison boolean
    const match = modules.modules_level.find(
      (ml) => ml.levels.id === p.level_id
    );

    if (match) {
      // Level already exists: update only if 'required' changed
      if (match.required !== p.required) {
        return supabase
          .from("modules_level")
          .update({ required: p.required })
          .eq("module_id", id)
          .eq("level_id", p.level_id);
      }
      return null; // Return null if no changes needed
    } else {
      // Level does not exist: insert new association
      return supabase
        .from("modules_level")
        .insert({ module_id: id, level_id: p.level_id, required: p.required });
    }
  });

  // 3. Handle deletions
  const excludeIds = new Set(payload.map((item) => item.level_id));
  const deleteArray = modules.modules_level.filter(
    (ml) => !excludeIds.has(ml.levels.id)
  );

  const deletePromises = deleteArray.map((item) => {
    return supabase
      .from("modules_level")
      .delete()
      .eq("level_id", item.levels.id)
      .eq("module_id", id);
  });

  // Filter out nulls before awaiting promises
  const activeUpdatePromises = updatePromises.filter((p) => p !== null);

  const updateResults = await Promise.all(activeUpdatePromises);
  const deleteResults = await Promise.all(deletePromises);

  return { updateResults, deleteResults };
}
