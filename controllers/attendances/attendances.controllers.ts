import { NextRequest, NextResponse } from "next/server";
import { AttendanceService } from "@/services/attendances/services";
import { handleError } from "@/lib/errors/error.handler";

export class AttendanceController {
  static async createAttendance(request: NextRequest) {
    const body = await request.json();
    const { timetable_id, module_id, batch_id } = body;
    try {
      const data = await AttendanceService.create({ timetable_id, module_id, batch_id })
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }
}
