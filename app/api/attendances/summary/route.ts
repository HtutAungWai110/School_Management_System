import { NextRequest } from "next/server";
import { AttendanceController } from "@/controllers/attendances/attendances.controllers";

export async function GET(request: NextRequest) {
  return AttendanceController.summary(request);
}
