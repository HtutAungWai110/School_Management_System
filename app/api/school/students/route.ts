import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  const { data: students, error } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const { count: totalCount } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "student");

  const { count: newEnrollments } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "student")
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  if (error) {
    return NextResponse.json({ error: "Failed to fetch students" }, { status: 500 });
  }

  return NextResponse.json({ students, totalCount, newEnrollments });
}
