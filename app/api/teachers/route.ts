import { NextRequest } from "next/server";
import { TeacherController } from "@/controllers/teachers/teacher.controllers";

export async function GET(request: NextRequest) {
  return TeacherController.list(request);
}
