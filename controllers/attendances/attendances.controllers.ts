import { NextRequest, NextResponse } from "next/server";
import { AttendanceService } from "@/services/attendances/services";
import { handleError } from "@/lib/errors/error.handler";

export class AttendanceController {
  static async createAttendance(request: NextRequest) {
    const body = await request.json();
    const { timetable_id, module_id, batch_id, date } = body;
    try {
      const data = await AttendanceService.create({ timetable_id, module_id, batch_id, date })
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
      const { finalData, minDate, maxDate } = await AttendanceService.getAttendances(batchId, date)
      return NextResponse.json({ finalData, minDate, maxDate })
    } catch (error) {
      return handleError(error);
    }
  }

  static async update(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const id = params.get("id")
    const attendanceId = params.get("attendance_id")
    const studentId = params.get("student_id")
    const status = params.get("status")

    if(!id || !attendanceId || !studentId || !status) {
      return NextResponse.json({ error: "Missing required parameters" }, { status: 400 })
    }
    try {
      const attendanceUpdate = await AttendanceService.updateAttendance({ id, attendanceId, studentId, status })
      return NextResponse.json({attendanceUpdate})
    } catch (error) {
      return handleError(error);
    }
  }

  static async bulkUpdate(request: NextRequest) {
    let body: Array<{ id: string; attendance_id: string; student_id: string; status: string; remark?: string | null }>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ error: "Expected a non-empty array of updates" }, { status: 400 })
    }
    const normalized: Array<{ id: string; attendanceId: string; studentId: string; status: string; remark?: string | null }> = [];
    for (const item of body) {
      if (!item?.id || !item?.attendance_id || !item?.student_id || !item?.status) {
        return NextResponse.json({ error: "Each update requires id, attendance_id, student_id, status" }, { status: 400 })
      }
      normalized.push({
        id: item.id,
        attendanceId: item.attendance_id,
        studentId: item.student_id,
        status: item.status,
        remark: item.remark ?? null,
      });
    }
    try {
      const results = await AttendanceService.bulkUpdate(normalized);
      return NextResponse.json({ updated: results.length });
    } catch (error) {
      return handleError(error);
    }
  }
  static async getById(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

    try {
      const attendanceData = await AttendanceService.getById(id);
      if (!attendanceData) return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
      return NextResponse.json(attendanceData);
    } catch (error) {
      return handleError(error);
    }
  }
}
