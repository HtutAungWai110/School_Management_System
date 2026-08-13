import { createClient } from "@/lib/supabase/server.client";

const PAGE_SIZE = 20;

export class TeachersService {
  static async list(search: string, filter: string, page: number) {
    const supabase = await createClient();

    const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("profiles")
      .select(`
        *,
        teacher_modules(
          id,
          assigned_at,
          modules(
            id,
            code,
            title
          )
        )
      `, { count: "exact" })
      .eq("role", "teacher")
      .range(from, to);

    if (search) {
      query = query.ilike("full_name", `%${search}%`);
    }

    if (filter === "recent") {
      query = query.gte("created_at", recentSince);
    }

    query = query.order("created_at", { ascending: false });

    const { data: teachers, error } = await query;

    let countQuery = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher");

    if (search) {
      countQuery = countQuery.ilike("full_name", `%${search}%`);
    }

    if (filter === "recent") {
      countQuery = countQuery.gte("created_at", recentSince);
    }

    const { count } = await countQuery;

    const { count: newTeachers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher")
      .gte("created_at", recentSince);

    if (error) {
      throw new Error("Failed to fetch teachers");
    }

    const totalCount = count ?? 0;

    return { teachers, totalCount, newTeachers, page, totalPages: Math.ceil(totalCount / PAGE_SIZE) };
  }

  static async updateModules(teacherId: string, payload: Array<string>) {
    const supabase = await createClient();
    const { data: teacher_modules, error } = await supabase
      .from("teacher_modules")
      .select("*")
      .eq("teacher_id", teacherId);

    if (error) {
      throw new Error(error.message);
    }

    const existing = teacher_modules ?? [];

    const existingModuleIds = new Set(existing.map((tm) => tm.module_id));

    const addArray = payload.filter((moduleId) => !existingModuleIds.has(moduleId));

    const requestedIds = new Set(payload);

    const deleteArray = existing.filter((tm) => !requestedIds.has(tm.module_id));

    const addResults = await Promise.all(
      addArray.map((moduleId) =>
        supabase
          .from("teacher_modules")
          .insert({ teacher_id: teacherId, module_id: moduleId })
      )
    );

    const deleteResults = await Promise.all(
      deleteArray.map((tm) =>
        supabase
          .from("teacher_modules")
          .delete()
          .eq("teacher_id", teacherId)
          .eq("module_id", tm.module_id)
      )
    );

    return { addResults, deleteResults };
  }
}
