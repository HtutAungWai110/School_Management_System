import { NextRequest } from "next/server";
import { EnrollmentController } from "@/controllers/enrollments/enrollment.controllers";

export async function GET(request: NextRequest) {
  return EnrollmentController.list(request);
}
