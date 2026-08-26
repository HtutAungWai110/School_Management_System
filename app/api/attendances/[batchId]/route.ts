import { NextRequest } from "next/server";
import { AttendanceController } from "@/controllers/attendances/attendances.controllers";


export async function GET(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  return AttendanceController.list(request, {params})
}
