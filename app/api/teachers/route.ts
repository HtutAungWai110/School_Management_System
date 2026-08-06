import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server.client';

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const params = req.nextUrl.searchParams;
  const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
  const search = params.get("search") ?? "";
  const filter = params.get("filter") ?? "";

  const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const pageSize = 20;

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("profiles")
    .select("*", { count: "exact" })
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

  const totalCount = count ?? 0;

  const totalPages = Math.ceil(totalCount / pageSize);

  if (error) {
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
  }

  return NextResponse.json({ teachers, totalCount, newTeachers, page, totalPages });
}
