import { StudentController } from "@/controllers/students/student.controllers";
import { NextRequest } from "next/server";


export async function GET() {
  return StudentController.getEnrollments();
}

export async function POST(request: NextRequest) {
  return StudentController.createEnrollments(request)
}
