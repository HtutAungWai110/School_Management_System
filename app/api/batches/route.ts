import { NextRequest, NextResponse } from "next/server";
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

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const search = request.nextUrl.searchParams.get("search") ?? "";

  let query = supabase
    .from("batches")
    .select(BATCH_SELECT)
    .order("created_at", { ascending: false });

  if (search) {
    query = query.ilike("batch_name", `%${search}%`);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json().catch(() => ({ batch_name: undefined, level_ids: undefined }));
  const { batch_name, level_ids } = body;

  if (!batch_name || typeof batch_name !== "string" || !batch_name.trim()) {
    return NextResponse.json({ error: "Batch name is required" }, { status: 400 });
  }

  if (!Array.isArray(level_ids) || level_ids.length === 0) {
    return NextResponse.json({ error: "At least one level is required" }, { status: 400 });
  }

  const { data: batch, error: batchError } = await supabase
    .from("batches")
    .insert({ batch_name: batch_name.trim() })
    .select()
    .single();

  if (batchError) {
    return NextResponse.json({ error: batchError.message }, { status: 500 });
  }

  const levelRows = level_ids.map((level_id: string) => ({
    level_id,
    batch_level: batch.id,
  }));

  const { error: levelsError } = await supabase.from("batch_level").insert(levelRows);

  if (levelsError) {
    await supabase.from("batches").delete().eq("id", batch.id);
    return NextResponse.json({ error: levelsError.message }, { status: 500 });
  }

  return NextResponse.json({ data: batch }, { status: 201 });
}
