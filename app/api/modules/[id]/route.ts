import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server.client";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { code, title } = await request.json()

  const supabase = await createClient()

  const {data: codeExist, error: codeError} = await supabase
    .from("modules")
    .select("*")
    .neq("id", id)
    .eq("code", code)
    .maybeSingle();

  if (codeExist) {
    return NextResponse.json({ error: `Another module has the same code: ${code}`}, { status: 400 })
  }

  if (codeError) {
    return NextResponse.json({ error: codeError.message}, { status: 500 })
  }

  const { data, error } = await supabase
    .from("modules")
    .update({code: code, title: title})
    .eq("id", id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message}, { status: 500 })
  }

  return NextResponse.json({data})

}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()

  const { error } = await supabase
    .from("modules")
    .delete()
    .eq("id", id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
