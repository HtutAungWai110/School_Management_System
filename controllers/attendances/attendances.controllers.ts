import { NextRequest, NextResponse } from "next/server";
import { AttendanceService, type AttendanceScope } from "@/services/attendances/services";
import { handleError } from "@/lib/errors/error.handler";
import { readMonthParam, readPathUuid, readUuidParam } from "@/lib/api.util";

/** The reports take either a whole batch or a single session. Both at once is
 *  ambiguous, so it is rejected rather than silently narrowed. */
function readScope(request: NextRequest): {
  scope: AttendanceScope | null;
  error: NextResponse | null;
} {
  const { value: batchId, error: batchError } = readUuidParam(request, "batch_id");
  if (batchError) return { scope: null, error: batchError };

  const { value: timetableId, error: timetableError } = readUuidParam(request, "timetable_id");
  if (timetableError) return { scope: null, error: timetableError };

  if (batchId && timetableId) {
    return {
      scope: null,
      error: NextResponse.json(
        { error: "Provide either batch_id or timetable_id, not both" },
        { status: 400 }
      ),
    };
  }

  if (batchId) return { scope: { batchId }, error: null };
  if (timetableId) return { scope: { timetableId }, error: null };

  return {
    scope: null,
    error: NextResponse.json(
      { error: "Provide either batch_id or timetable_id" },
      { status: 400 }
    ),
  };
}

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

  /** The month's sessions and per-date counts. No student identities. */
  static async list(request: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
    const { batchId } = await params;
    const { id, error } = readPathUuid(batchId, "batch id");
    if (error) return error;

    const { date, error: dateError } = readMonthParam(request);
    if (dateError) return dateError;

    try {
      const data = await AttendanceService.getCalendar({ batchId: id! }, date ?? null)
      return NextResponse.json(data)
    } catch (error) {
      return handleError(error);
    }
  }

  /** One date's students, fetched when the date row is opened. */
  static async session(request: NextRequest) {
    const { value: timetableId, error } = readUuidParam(request, "timetable_id");
    if (error) return error;
    if (!timetableId) {
      return NextResponse.json({ error: "The timetable_id parameter is required" }, { status: 400 });
    }

    const { date, error: dateError } = readMonthParam(request);
    if (dateError) return dateError;
    if (!date) {
      return NextResponse.json({ error: "The date parameter is required" }, { status: 400 });
    }

    try {
      const students = await AttendanceService.getSessionRoster(timetableId, date);
      return NextResponse.json(students);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Present/late/absent per module, fetched when the summary is opened. */
  static async summary(request: NextRequest) {
    const { scope, error } = readScope(request);
    if (error) return error;

    const { date, error: dateError } = readMonthParam(request);
    if (dateError) return dateError;

    try {
      const modules = await AttendanceService.getModuleSummary(scope!, date ?? null);
      return NextResponse.json(modules);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Per-student rates per module, fetched when that section is opened. */
  static async rates(request: NextRequest) {
    const { scope, error } = readScope(request);
    if (error) return error;

    const { date, error: dateError } = readMonthParam(request);
    if (dateError) return dateError;

    try {
      const students = await AttendanceService.getStudentRates(scope!, date ?? null);
      return NextResponse.json(students);
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
      // if (!attendanceData) return NextResponse.json({ error: "Attendance not found" }, { status: 404 });
      return NextResponse.json(attendanceData);
    } catch (error) {
      return handleError(error);
    }
  }
}
