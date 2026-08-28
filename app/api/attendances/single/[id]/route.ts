import { NextRequest } from "next/server";
import { AttendanceController } from "@/controllers/attendances/attendances.controllers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return AttendanceController.getById(request, {params})
}
