import { NextRequest } from "next/server";
import { AttendanceController } from "@/controllers/attendances/attendances.controllers";

export async function POST(request: NextRequest) {
  return AttendanceController.createAttendance(request)
}
