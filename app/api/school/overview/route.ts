import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  // 1. Initialize Supabase with cookie access
  const supabase = await createClient();

  // 2. Fetch counts (now authenticated as the logged-in admin)
  const { count: studentCount, error: studentError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "student");

  const { count: teacherCount, error: teacherError } = await supabase
    .from("profiles")
    .select("*", { count: "exact", head: true })
    .eq("role", "teacher");

  if (studentError || teacherError) {
    return NextResponse.json({ error: "Failed to fetch counts" }, { status: 500 });
  }

  return NextResponse.json({ studentCount, teacherCount });
}
