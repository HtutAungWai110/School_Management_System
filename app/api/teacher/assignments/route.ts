import { TeacherController } from "@/controllers/teachers/teacher.controllers";

/** Every assignment the signed-in teacher has set, with submissions attached. */
export async function GET() {
  return TeacherController.getAssignments()
}