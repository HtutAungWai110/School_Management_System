import { TeacherController } from "@/controllers/teachers/teacher.controllers";

export async function GET() {
  return TeacherController.getOverview()
}
