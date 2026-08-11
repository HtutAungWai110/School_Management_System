import { NextRequest } from "next/server";
import { StudentController } from "@/controllers/students/student.controllers";

export async function GET(request: NextRequest) {
  return StudentController.list(request);
}
