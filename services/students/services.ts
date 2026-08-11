import { createClient } from "@/lib/supabase/server.client";

const PAGE_SIZE = 20;

export class StudentsService {
  static async list(search: string, filter: string, page: number) {
    const supabase = await createClient();

    const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .eq("role", "student")
      .range(from, to);

    if (search) {
      query = query.ilike("full_name", `%${search}%`);
    }

    if (filter === "recent") {
      query = query.gte("created_at", recentSince);
    }

    query = query.order("created_at", { ascending: false });

    const { data: students, error } = await query;

    let countQuery = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

    if (search) {
      countQuery = countQuery.ilike("full_name", `%${search}%`);
    }

    if (filter === "recent") {
      countQuery = countQuery.gte("created_at", recentSince);
    }

    const { count } = await countQuery;

    const { count: newEnrollments } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student")
      .gte("created_at", recentSince);

    if (error) {
      throw new Error("Failed to fetch students");
    }

    const totalCount = count ?? 0;

    return { students, totalCount, newEnrollments, page, totalPages: Math.ceil(totalCount / PAGE_SIZE) };
  }
}
