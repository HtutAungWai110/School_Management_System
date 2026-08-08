import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server.client";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();

  const { error } = await supabase
    .from("student_enrollments")
    .delete()
    .eq("student_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { batch_id } = await request.json().catch(() => ({ batch_id: undefined }));

  if (!batch_id || typeof batch_id !== "string") {
    return NextResponse.json({ error: "Batch is required" }, { status: 400 });
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("batch_assignments")
    .insert({ bacth_id: batch_id, student_id: id });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
