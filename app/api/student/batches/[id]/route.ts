import { NextRequest } from "next/server";
import { StudentController } from "@/controllers/students/student.controllers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return StudentController.getBatchDetail(request, {params})
}
