import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server.client";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{id: string}>}) {
  const { id } = await params;
  const {batch_name} = await request.json()

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("batches")
    .update({batch_name: batch_name})
    .eq("id", id)
    .select()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });




}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{id: string}>}) {
  const { id } = await params;

  const supabase = await createClient();

  const { error: levelsError } = await supabase
    .from("batch_level")
    .delete()
    .eq("batch_level", id)

  if (levelsError) {
    return NextResponse.json({ error: levelsError.message }, { status: 500 });
  }

  const { error: assignmentsError } = await supabase
    .from("batch_assignments")
    .delete()
    .eq("bacth_id", id)

  if (assignmentsError) {
    return NextResponse.json({ error: assignmentsError.message }, { status: 500 });
  }

  const { error } = await supabase
    .from("batches")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
