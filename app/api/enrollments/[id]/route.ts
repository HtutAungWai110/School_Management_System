import { NextRequest } from "next/server";
import { EnrollmentController } from "@/controllers/enrollments/enrollment.controllers";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return EnrollmentController.remove(request, { params });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return EnrollmentController.assignToBatch(request, { params });
}
