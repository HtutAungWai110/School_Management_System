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
  static async list(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
    const { batchId } = await params;
    const urlParms = request.nextUrl.searchParams;
    const date = urlParms.get("date") ?? null;

    try {
      const {finalData, minDate, maxDate} = await AttendanceService.getAttendances(batchId, date)
      return NextResponse.json({finalData, minDate, maxDate})
    } catch (error) {
      return handleError(error);
    }
  }
}
