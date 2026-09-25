import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server.client";

export async function POST(request: NextRequest) {
  try {
    const { batch_id, teacher_id, class_id } = await request.json().catch(() => ({}));

    if (!batch_id || !teacher_id || !class_id) {
      return NextResponse.json(
        { error: "batch_id, teacher_id, and class_id are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const [{ data: teacherData, error: teacherError }, { data: classData, error: classError }, { data: batchData, error: batchError }] = await Promise.all([
      supabase.rpc("get_teacher_availability", { p_teacher_id: teacher_id }),
      supabase.rpc("get_class_availability", { p_class_id: class_id }),
      supabase.rpc("get_batch_availability", { p_batch_id: batch_id }),
    ]);

    if (teacherError) return NextResponse.json({ error: teacherError.message }, { status: 500 });
    if (classError) return NextResponse.json({ error: classError.message }, { status: 500 });
    if (batchError) return NextResponse.json({ error: batchError.message }, { status: 500 });

    return NextResponse.json({
      teacher: teacherData,
      class: classData,
      batch: batchData,
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
