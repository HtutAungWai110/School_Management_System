import { NextRequest } from "next/server";
import { TeacherController } from "@/controllers/teachers/teacher.controllers";

/** The same report the teacher's own page shows, for an arbitrary teacher.
 *  Admin-facing: the id comes from the path, validated as a uuid by the
 *  controller before it reaches the service. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return TeacherController.getTeacherClassHistory(request, { params })
}