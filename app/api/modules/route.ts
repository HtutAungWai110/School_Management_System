import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server.client";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('modules')
    .select(`
      id,
      code,
      title,
      modules_level (
        required,
        levels (
          id,
          description
        )
      )
    `);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}
