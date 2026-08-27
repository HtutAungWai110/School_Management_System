import { NextRequest } from "next/server";
import { AttendanceController } from "@/controllers/attendances/attendances.controllers";

export async function PATCH(request: NextRequest) {
  return AttendanceController.bulkUpdate(request)
}
