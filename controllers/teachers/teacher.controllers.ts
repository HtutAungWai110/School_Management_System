import { NextRequest, NextResponse } from "next/server";
import { TeachersService } from "@/services/teachers/services";
import { handleError } from "@/lib/errors/error.handler";
import { HttpError } from "@/lib/errors/http.error";
import { createClient } from "@/lib/supabase/server.client";
// `readIdParam` for the teacher directory (a single profile lookup);
// `readIdParams` for the timetable, where a swap links to two sessions.
import { readIdParam, readIdParams, readMonthParam, readPathUuid, readUuidParam } from "@/lib/api.util";

export class TeacherController {
  static async list(request: NextRequest) {
    const { id, error } = readIdParam(request);
    if (error) return error;

    const params = request.nextUrl.searchParams;
    const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
    const search = params.get("search") ?? "";
    const filter = params.get("filter") ?? "";

    try {
      const result = await TeachersService.list(search, filter, page, id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async updateModules(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json();

    const { modules } = body as { modules: Array<string> };
    try {
      const { addResults, deleteResults } = await TeachersService.updateModules(id, modules);
      return NextResponse.json({ addResults, deleteResults });
    } catch (error) {
      return handleError(error);
    }
  }

  static async getOverview() {
    try {
      const {totalSessions, timetableSessions, totalUniqueStudents} = await TeachersService.getOverview();
      return NextResponse.json({totalSessions, timetableSessions, totalUniqueStudents})
    } catch (error) {
      return handleError(error);
    }
  }

  static async getTimetableSessions(request: NextRequest) {
    /* Accepts `?id=` repeated so a swap notification can point at both
       sessions it moved. RLS still confines the result to this teacher's own
       rows, so a foreign id matches nothing rather than leaking. */
    const { ids, error } = readIdParams(request);
    if (error) return error;

    try {
      const timetableSessions = await TeachersService.getTimetableSessions(ids);
      return NextResponse.json(timetableSessions);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Class history takes an optional month anchor rather than an id — it is a
   *  month-scoped report across every session, not a single record lookup.
   *
   *  The teacher is resolved from the session rather than the query string, so
   *  one teacher cannot read another's history by editing a parameter. The
   *  service accepts the id explicitly so an admin endpoint can hand it any
   *  teacher's id and get the same report back. */
  static async getClassHistory(request: NextRequest) {
    const { date, error } = readMonthParam(request);
    if (error) return error;

    try {
      const supabase = await createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user) throw new HttpError(401, "Authentication required.");

      const history = await TeachersService.getClassHistory(user.id, date);
      return NextResponse.json(history);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Class history for an arbitrary teacher, for the admin teacher list.
   *
   *  Distinct from the teacher-facing endpoint above: there the id is resolved
   *  from the session so one teacher cannot read another's, here it comes from
   *  the path and is validated as a uuid before it reaches the service. Both
   *  land on the same service method. */
  static async getTeacherClassHistory(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    const { id: teacherId, error: idError } = readPathUuid(id, "teacher id");
    if (idError) return idError;
    /* Unreachable alongside idError, but the reader's success type is widened to
       `string | undefined`, so this is what narrows it for the service. */
    if (!teacherId) {
      return NextResponse.json({ error: "The teacher id must be a valid uuid" }, { status: 400 });
    }

    const { date, error } = readMonthParam(request);
    if (error) return error;

    try {
      const history = await TeachersService.getClassHistory(teacherId, date);
      return NextResponse.json(history);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getModules() {
    try {
      const { formattedData } = await TeachersService.getModules()
      return NextResponse.json(formattedData)
    } catch (error) {
      return handleError(error);
    }
  }

static async getAssignments(request: NextRequest) {
    /* A submission notification links to one assignment and one of its
       submissions, so both deep-link filters are honoured here. */
    const { id, error: idError } = readIdParam(request);
    if (idError) return idError;

    const { value: submissionId, error: submissionError } = readUuidParam(request, "submissionId");
    if (submissionError) return submissionError;

    try {
      const data = await TeachersService.getOwnAssignments(id, submissionId);
      return NextResponse.json(data)
    } catch (error) {
      return handleError(error);
    }
  }

  static async getTodayAttendance(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
      const attendanceData = await TeachersService.getTodayAttendance(id);
      return NextResponse.json(attendanceData);
    } catch (error) {
      return handleError(error);
    }



  }
  static async getTimetableDetail(_request: NextRequest, { params }: { params: Promise<{id: string}>}) {
    const { id } = await params;
    try {
      const timetableDetail = await TeachersService.getTimetableDetail(id);
      return NextResponse.json(timetableDetail);
    } catch (error) {
      return handleError(error);
    }
  }
  static async getTimetableAttendances(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
      const searchParams = request.nextUrl.searchParams;
      const date = searchParams.get("date");
      const result = await TeachersService.getTimetableAttendances(id, date);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
}
