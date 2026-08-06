import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server.client";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const params = req.nextUrl.searchParams;

  const search = params.get('search') ?? "";
  let query = supabase
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
  if (search) {
    query
      .ilike('title', `%${search}%`);
  }

  const {data, error} = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 200 });
}
