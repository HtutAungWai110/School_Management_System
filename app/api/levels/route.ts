import { createClient } from "@/lib/supabase/server.client";
import { NextResponse } from "next/server";


export async function GET(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("levels")
    .select(`
      id,
      description,
      created_at,
      modules_level(
        modules(
          id,
          code,
          title
        )
      )
      `)
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
  return NextResponse.json(data)
}
