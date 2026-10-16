import { NextRequest } from "next/server";
import { TeacherController } from "@/controllers/teachers/teacher.controllers";

/** Every assignment the signed-in teacher has set, with submissions attached.
 *  Accepts ?id= for one assignment and ?submissionId= for one submission. */
export async function GET(request: NextRequest) {
  return TeacherController.getAssignments(request)
}