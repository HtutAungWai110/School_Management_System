import { NextRequest } from "next/server";
import { EnrollmentController } from "@/controllers/enrollments/enrollment.controllers";

export async function GET(request: NextRequest) {
  return EnrollmentController.list(request);
}

export async function POST(request: NextRequest) {
  return EnrollmentController.assignBatch(request);
}

export async function DELETE(request: NextRequest) {
  return EnrollmentController.removeMany(request);
}
