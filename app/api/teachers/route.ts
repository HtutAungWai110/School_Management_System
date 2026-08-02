import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server.client';

export async function GET(req: NextRequest) {
  const supabase = await createClient();

  const params = req.nextUrl.searchParams;
  const page = params.get("page") ?? "1"

  const pageSize = 20;

  const from = Math.max((parseInt(page, 10) - 1) * pageSize, 1);
  const to = from + pageSize - 1

  const { data: teachers, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "teacher")
    .range(from, to)
    .order("created_at", { ascending: false });

  const { count } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "teacher");

  const { count: newTeachers } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "teacher")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const totalCount = count ?? 0;

  const totalPages = Math.ceil(totalCount / pageSize || 0)

  if (error) {
    return NextResponse.json({ error: "Failed to fetch teachers" }, { status: 500 });
  }

  return NextResponse.json({ teachers, totalCount, newTeachers, page, totalPages });
}
