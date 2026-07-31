import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: Request, { params }: { params: Promise<{id: string}>}) {
  const { id } = await params;
  const data = await req.json();

  const supabase = await createClient();

  const { data: profileData, error } = await supabase.from("profiles")
    .update(data)
    .eq("id", id)
    .select()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (!profileData || profileData.length === 0) {
      return NextResponse.json(
        { error: "RLS violation: You do not have permission to update this profile." },
        { status: 403 }
      );
    }

  return NextResponse.json({ profileData: profileData[0], id: id })
}
