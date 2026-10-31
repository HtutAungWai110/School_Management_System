import { createClient } from "@/lib/supabase/server.client";
import { BatchesService } from "@/services/batches/services";
import { NotificationsService } from "@/services/notifications/services";
import { first } from "@/lib/supabase.util";
import { HttpError } from "@/lib/errors/http.error";
import type {
  AttendanceCalendarResponse,
  AttendanceCalendarSession,
  AttendanceCalendarSummaryResponse,
  AttendanceSession,
  AttendanceStudent,
  ModuleAttendanceStats,
  StudentModuleRate,
} from "@/types/attendance.type";

export const ATTENDANCE_SELECT = `
  id,
  modules(
    id,
    title,
    code
  ),
  profiles(
    id,
    full_name,
    email,
    phone
  ),
  classes(
    id,
    class_number
  ),
  batches(
    id,
    batch_name
  ),
  day_of_week,
  start_time,
  end_time,
  status,
  attendances!inner (
    id,
    date,
    student_attendances(
      id,
      attendance_id,
      student_id,
      status,
      remark,
      profiles(
        id,
        full_name,
        email,
        phone
      )
    )
  )
  `

/** Staff calendar. Same shape as ATTENDANCE_SELECT minus every student
 *  identity: the list only renders counts, and names are fetched per date. */
export const ATTENDANCE_CALENDAR_SELECT = `
  id,
  modules(
    id,
    title,
    code
  ),
  profiles(
    id,
    full_name,
    email,
    phone
  ),
  classes(
    id,
    class_number
  ),
  batches(
    id,
    batch_name
  ),
  day_of_week,
  start_time,
  end_time,
  status,
  attendances!inner (
    date,
    student_attendances(
      student_id,
      status
    )
  )
  `

/** One date's roster, read when that date row is opened. */
const ATTENDANCE_ROSTER_SELECT = `
  date,
  student_attendances(
    id,
    attendance_id,
    student_id,
    status,
    remark,
    profiles(
      full_name,
      email,
      phone
    )
  )
  `

/** Module roll-up: statuses only, no identities. */
const ATTENDANCE_SUMMARY_SELECT = `
  id,
  modules(
    id,
    title,
    code
  ),
  attendances!inner (
    date,
    student_attendances(
      status
    )
  )
  `

/** Per-student rates: the one report that needs names, and only on demand. */
const ATTENDANCE_RATES_SELECT = `
  id,
  modules(
    id,
    title,
    code
  ),
  attendances!inner (
    date,
    student_attendances(
      student_id,
      status,
      profiles(
        full_name,
        email,
        phone
      )
    )
  )
  `

/** The student's own calendar: no cohort rows, no profile join. */
const STUDENT_ATTENDANCE_SELECT = `
  id,
  modules(
    id,
    title,
    code
  ),
  profiles(
    id,
    full_name,
    email,
    phone
  ),
  classes(
    id,
    class_number
  ),
  batches(
    id,
    batch_name
  ),
  day_of_week,
  start_time,
  end_time,
  status,
  attendances!inner (
    date,
    student_attendances(
      id,
      attendance_id,
      student_id,
      status,
      remark
    )
  )
  `

/** Which timetables a request covers: one batch, or a single session. */
export type AttendanceScope = { batchId: string } | { timetableId: string };

type AttendanceData = {
  timetable_id: string;
  module_id: string;
  batch_id: string;
  date: string | null;
};

type RawStudentAttendance = {
  id: string;
  attendance_id: string;
  student_id: string;
  status: AttendanceSession["attendances"][string][number]["status"];
  remark: string | null;
  profiles: { full_name: string; email: string; phone: string } | null;
};

export type RawAttendance = {
  date: string;
  student_attendances: RawStudentAttendance[];
};

/** The shapes the lighter selects actually return. PostgREST hands back an
 *  embedded relation as `T[] | null`, so each one is narrowed here instead of
 *  casting at every use site. */
type CalendarRow = Omit<AttendanceSession, "attendances"> & {
  attendances:
    | Array<{
        date: string;
        student_attendances: Array<{ student_id: string; status: string }> | null;
      }>
    | null;
};

type RosterRow = {
  id: string;
  attendance_id: string;
  student_id: string;
  status: AttendanceStudent["status"];
  remark: string | null;
  profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
};

type SummaryRow = {
  modules: { id: string; title: string | null; code: string | null } | null;
  attendances:
    | Array<{ date: string; student_attendances: Array<{ status: string }> | null }>
    | null;
};

type RateRow = {
  modules: { id: string; title: string | null; code: string | null } | null;
  attendances:
    | Array<{
        date: string;
        student_attendances:
          | Array<{
              student_id: string;
              status: string;
              profiles: { full_name: string | null; email: string | null; phone: string | null } | null;
            }>
          | null;
      }>
    | null;
};

type StudentCalendarRow = Omit<AttendanceSession, "attendances"> & {
  attendances:
    | Array<{
        date: string;
        student_attendances:
          | Array<{
              id: string;
              attendance_id: string;
              student_id: string;
              status: AttendanceStudent["status"];
              remark: string | null;
            }>
          | null;
      }>
    | null;
};

/** Formats a Date as a plain local calendar day (YYYY-MM-DD).
 *
 *  `toISOString()` must not be used for this: it converts to UTC first, so a
 *  month boundary built from local midnight becomes the *previous* day anywhere
 *  east of Greenwich. In BST that turned an October query into Sep 30 – Oct 30,
 *  pulling the last day of the previous month in and dropping the last day of
 *  the current one. `attendances.date` is a `date` column, so it only ever needs
 *  the calendar day anyway. */
export function toLocalDateString(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function mapAttendance(
  item: Omit<AttendanceSession, "attendances"> & { attendances: RawAttendance[] }
): AttendanceSession {
  const attendances: AttendanceSession["attendances"] = {};
  item.attendances.forEach((attendanceItem) => {
    if (!attendances[attendanceItem.date]) {
      attendances[attendanceItem.date] = attendanceItem.student_attendances.map((student) => {
        const { profiles, ...rest } = student
        return {
          ...rest,
          full_name: profiles?.full_name ?? null,
          email: profiles?.email ?? null,
          phone: profiles?.phone ?? null,
        }
      })
    }
  })
  return {
    ...item,
    attendances,
  };
}

export function buildFinalData(
  attendanceData: Array<
    Omit<AttendanceSession, "attendances"> & { attendances: RawAttendance[] }
  >
): AttendanceSession[] {
  return attendanceData.map(mapAttendance);
}

export class AttendanceService {
  static async create({ timetable_id, module_id, batch_id, date = null }: AttendanceData) {
    const supabase = await createClient();

    /* Carries the session's own details so the check-in notification can name
       the session without a second round trip. */
    const { data: timetableData, error: timetableDataError } = await supabase
      .from("timetables")
      .select("id, day_of_week, start_time, end_time, modules(code), batches(batch_name)")
      .eq("id", timetable_id)
      .eq("module_id", module_id)
      .eq("batch_id", batch_id)
      .single();

    if (timetableDataError) throw timetableDataError;
    if (!timetableData) throw new Error("Timetable not found");

    const studentFlatIds = await BatchesService.getStudents(batch_id, module_id);

    const query =  supabase
      .from("attendances")
      .insert({ timetable_id, date : date ?? new Date().toISOString() })
      .select("id")
      .single();

    const { data: attendance, error: attendanceInsertError } = await query;

    if (attendanceInsertError) {
      if (attendanceInsertError.code === "23505") {
        throw new Error(
          "Attendance for this class session already exists today. You can only record attendance once per session per day."
        );
      }
      throw attendanceInsertError;
    }

    if (studentFlatIds.length > 0) {
      const studentAttendanceRows = studentFlatIds.map((student_id) => ({
        attendance_id: attendance.id,
        student_id,
        status: "absent" as const,
      }));

      const { error: studentAttendanceError } = await supabase
        .from("student_attendances")
        .insert(studentAttendanceRows);

      if (studentAttendanceError) throw studentAttendanceError;
    }

    /* Admins need to know a session opened: the rows above all say "absent"
       until someone marks them, so the notification is the prompt to act. Runs
       only for a teacher — an admin marking their own session is not news to
       the other admins, and the message is phrased around the teacher. */
    await this.notifyAdminsOfCheckIn(attendance.id, timetableData);

    return {
      attendance_id: attendance.id,
      enrolled_students: studentFlatIds.length,
    };
  }

  private static async notifyAdminsOfCheckIn(
    attendanceId: string,
    timetableData: {
      day_of_week?: number | null;
      start_time?: string | null;
      end_time?: string | null;
      modules?: { code?: string | null } | { code?: string | null }[] | null;
      batches?: { batch_name?: string | null } | { batch_name?: string | null }[] | null;
    } | null
  ) {
    try {
      const supabase = await createClient();

      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) return;

      const { data: actor, error: actorError } = await supabase
        .from("profiles")
        .select("id, role, full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (actorError || !actor || actor.role !== "teacher") return;

      const session = first<{ code?: string | null }>(timetableData?.modules);
      const batch = first<{ batch_name?: string | null }>(timetableData?.batches);

      await NotificationsService.notifyTeacherCheckIn({
        teacherId: actor.id,
        teacherName: actor.full_name,
        attendanceId,
        session: {
          moduleCode: session?.code ?? null,
          batchName: batch?.batch_name ?? null,
          dayOfWeek: timetableData?.day_of_week ?? null,
          startTime: timetableData?.start_time ?? null,
          endTime: timetableData?.end_time ?? null,
        },
      });
    } catch (error) {
      // Never fail a successful check-in because the announcement did not send.
      console.error("[notifications] check-in failed:", error);
    }
  }

  /**
   * The month of attendance to read, plus the bounds the pager may move
   * between.
   *
   * `date` is any day inside the requested month; omitting it resolves to the
   * month of the latest recorded session. Parsed as local midnight, because
   * `new Date("2026-10-01")` is UTC and lands in September west of Greenwich.
   */
  private static async monthWindow(
    supabase: Awaited<ReturnType<typeof createClient>>,
    scope: AttendanceScope,
    date: string | null
  ) {
    const timetableIds = await this.timetableIdsFor(supabase, scope);

    if (timetableIds.length === 0) {
      return { timetableIds, start: null, end: null, minDate: null, maxDate: null };
    }

    const [minRow, maxRow] = await Promise.all([
      supabase
        .from("attendances")
        .select("date")
        .in("timetable_id", timetableIds)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("attendances")
        .select("date")
        .in("timetable_id", timetableIds)
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (minRow.error) throw new Error(minRow.error.message);
    if (maxRow.error) throw new Error(maxRow.error.message);

    const minDate = minRow.data?.date ?? null;
    const maxDate = maxRow.data?.date ?? null;

    if (!minDate || !maxDate) {
      return { timetableIds, start: null, end: null, minDate, maxDate };
    }

    const base = date
      ? new Date(`${date}T00:00:00`)
      : new Date(`${maxDate}T00:00:00`);

    return {
      timetableIds,
      start: toLocalDateString(new Date(base.getFullYear(), base.getMonth(), 1)),
      end: toLocalDateString(new Date(base.getFullYear(), base.getMonth() + 1, 0)),
      minDate,
      maxDate,
    };
  }

  /** Every timetable the request covers: one batch, or a single session. */
  private static async timetableIdsFor(
    supabase: Awaited<ReturnType<typeof createClient>>,
    scope: AttendanceScope
  ) {
    if ("timetableId" in scope) return [scope.timetableId];

    const { data, error } = await supabase
      .from("timetables")
      .select("id")
      .eq("batch_id", scope.batchId);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => row.id);
  }

  /**
   * The staff calendar: one row per timetable, each date reduced to counts.
   *
   * This is the query that used to carry every student's name, email and phone
   * for the whole month. It now selects `student_id` and `status` only, and the
   * roster for a single date is a separate request made when that date opens.
   */
  static async getCalendar(
    scope: AttendanceScope,
    date: string | null
  ): Promise<AttendanceCalendarSummaryResponse> {
    const supabase = await createClient();
    const window = await this.monthWindow(supabase, scope, date);

    if (!window.start || !window.end) {
      return {
        finalData: [],
        minDate: window.minDate,
        maxDate: window.maxDate,
        studentCount: 0,
      };
    }

    const query = supabase
      .from("timetables")
      .select(ATTENDANCE_CALENDAR_SELECT)
      .gte("attendances.date", window.start)
      .lte("attendances.date", window.end);

    const scoped =
      "batchId" in scope
        ? query.eq("batch_id", scope.batchId)
        : query.eq("id", scope.timetableId);

    const { data, error } = await scoped;

    if (error) throw new Error(error.message);

    const students = new Set<string>();

    const finalData: AttendanceCalendarSession[] = (
      (data ?? []) as unknown as CalendarRow[]
    ).map((row) => {
      const { attendances, ...session } = row;

      const days = (attendances ?? [])
        .map((entry) => {
          let present = 0;
          let late = 0;
          let absent = 0;

          for (const mark of entry.student_attendances ?? []) {
            students.add(mark.student_id);
            if (mark.status === "present") present += 1;
            else if (mark.status === "late") late += 1;
            else if (mark.status === "absent") absent += 1;
          }

          return {
            date: entry.date,
            present,
            late,
            absent,
            total: present + late + absent,
          };
        })
        .sort((a, b) => a.date.localeCompare(b.date));

      return { ...session, days };
    });

    return {
      finalData,
      minDate: window.minDate,
      maxDate: window.maxDate,
      studentCount: students.size,
    };
  }

  /** One date's students, fetched only when that date row is expanded. */
  static async getSessionRoster(
    timetableId: string,
    date: string
  ): Promise<AttendanceStudent[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("attendances")
      .select(ATTENDANCE_ROSTER_SELECT)
      .eq("timetable_id", timetableId)
      .eq("date", date)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!data) return [];

    const rows = (
      data as unknown as {
        student_attendances: RosterRow[] | null;
      }
    ).student_attendances;

    return (rows ?? []).map(({ profiles, ...rest }) => ({
      ...rest,
      full_name: profiles?.full_name ?? null,
      email: profiles?.email ?? null,
      phone: profiles?.phone ?? null,
    }));
  }

  /** Present/late/absent per module for the month, for the summary section. */
  static async getModuleSummary(
    scope: AttendanceScope,
    date: string | null
  ): Promise<ModuleAttendanceStats[]> {
    const supabase = await createClient();
    const window = await this.monthWindow(supabase, scope, date);

    if (!window.start || !window.end) return [];

    const query = supabase
      .from("timetables")
      .select(ATTENDANCE_SUMMARY_SELECT)
      .gte("attendances.date", window.start)
      .lte("attendances.date", window.end);

    const scoped =
      "batchId" in scope
        ? query.eq("batch_id", scope.batchId)
        : query.eq("id", scope.timetableId);

    const { data, error } = await scoped;

    if (error) throw new Error(error.message);

    const byModule = new Map<string, ModuleAttendanceStats>();

    for (const row of (data ?? []) as unknown as SummaryRow[]) {
      const course = row.modules;
      if (!course) continue;

      let stats = byModule.get(course.id);
      if (!stats) {
        stats = {
          moduleId: course.id,
          code: course.code ?? "",
          title: course.title ?? "",
          sessions: 0,
          present: 0,
          late: 0,
          absent: 0,
          total: 0,
        };
        byModule.set(course.id, stats);
      }

      stats.sessions += 1;

      for (const entry of row.attendances ?? []) {
        for (const mark of entry.student_attendances ?? []) {
          stats.total += 1;
          if (mark.status === "present") stats.present += 1;
          else if (mark.status === "late") stats.late += 1;
          else stats.absent += 1;
        }
      }
    }

    return [...byModule.values()].sort((a, b) => b.total - a.total);
  }

  /** Per-student attendance rate per module, for the rates section. */
  static async getStudentRates(
    scope: AttendanceScope,
    date: string | null
  ): Promise<StudentModuleRate[]> {
    const supabase = await createClient();
    const window = await this.monthWindow(supabase, scope, date);

    if (!window.start || !window.end) return [];

    const query = supabase
      .from("timetables")
      .select(ATTENDANCE_RATES_SELECT)
      .gte("attendances.date", window.start)
      .lte("attendances.date", window.end);

    const scoped =
      "batchId" in scope
        ? query.eq("batch_id", scope.batchId)
        : query.eq("id", scope.timetableId);

    const { data, error } = await scoped;

    if (error) throw new Error(error.message);

    const byStudent = new Map<
      string,
      {
        studentId: string;
        fullName: string;
        email: string;
        phone: string;
        modules: Map<
          string,
          { moduleId: string; code: string; title: string; present: number; total: number }
        >;
      }
    >();

    for (const row of (data ?? []) as unknown as RateRow[]) {
      const course = row.modules;
      if (!course) continue;

      for (const entry of row.attendances ?? []) {
        for (const mark of entry.student_attendances ?? []) {
          let student = byStudent.get(mark.student_id);
          if (!student) {
            student = {
              studentId: mark.student_id,
              fullName: mark.profiles?.full_name ?? "Unknown student",
              email: mark.profiles?.email ?? "",
              phone: mark.profiles?.phone ?? "",
              modules: new Map(),
            };
            byStudent.set(mark.student_id, student);
          }

          let rate = student.modules.get(course.id);
          if (!rate) {
            rate = {
              moduleId: course.id,
              code: course.code ?? "",
              title: course.title ?? "",
              present: 0,
              total: 0,
            };
            student.modules.set(course.id, rate);
          }

          rate.total += 1;
          if (mark.status === "present") rate.present += 1;
        }
      }
    }

    return [...byStudent.values()]
      .map((student) => ({
        studentId: student.studentId,
        fullName: student.fullName,
        email: student.email,
        phone: student.phone,
        modules: [...student.modules.values()]
          .map((rate) => ({
            ...rate,
            percentage: rate.total
              ? Math.round((rate.present / rate.total) * 1000) / 10
              : 0,
          }))
          .sort((a, b) => b.percentage - a.percentage),
      }))
      .sort((a, b) => a.fullName.localeCompare(b.fullName));
  }

  /**
   * The signed-in student's own month.
   *
   * Same calendar shape the student panel already reads, but every date keeps
   * only the caller's row, so a student never receives their cohort's marks.
   */
  static async getStudentCalendar(
    batchId: string,
    date: string | null
  ): Promise<AttendanceCalendarResponse> {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new HttpError(401, "You must be signed in to continue");
    }

    const window = await this.monthWindow(supabase, { batchId }, date);

    if (!window.start || !window.end) {
      return { finalData: [], minDate: window.minDate, maxDate: window.maxDate };
    }

    const { data, error } = await supabase
      .from("timetables")
      .select(STUDENT_ATTENDANCE_SELECT)
      .eq("batch_id", batchId)
      .gte("attendances.date", window.start)
      .lte("attendances.date", window.end);

    if (error) throw new Error(error.message);

    const finalData: AttendanceSession[] = (
      (data ?? []) as unknown as StudentCalendarRow[]
    )
      .map((row) => {
        const { attendances, ...session } = row;
        const own: AttendanceSession["attendances"] = {};

        for (const entry of attendances ?? []) {
          const marks = (entry.student_attendances ?? []).filter(
            (mark) => mark.student_id === user.id
          );

          if (marks.length > 0) {
            /* The student view never shows cohort details, so the profile
               columns are intentionally absent rather than fetched. */
            own[entry.date] = marks.map((mark) => ({
              ...mark,
              full_name: null,
              email: null,
              phone: null,
            }));
          }
        }

        return { ...session, attendances: own };
      })
      /* A session with no mark for this student is not theirs to see. */
      .filter((session) => Object.keys(session.attendances).length > 0);

    return { finalData, minDate: window.minDate, maxDate: window.maxDate };
  }

  static async updateAttendance({id, attendanceId, studentId, status, remark = null}: {id: string; attendanceId: string; studentId: string; status: string; remark?: string | null; }) {
    const supabase = await createClient();
    const { data: attendanceExist, error: attendanceExistError } = await supabase
      .from("student_attendances")
      .select("*")
      .eq("id", id)
      .eq("attendance_id", attendanceId)
      .eq("student_id", studentId)
      .single();
    if (attendanceExistError || !attendanceExist) throw new Error("Attendance not found");

    const {data: attendanceUpdate, error: attendanceUpdateError} = await supabase
      .from("student_attendances")
      .update({ status, remark })
      .eq("id", id)
      .eq("attendance_id", attendanceId)
      .eq("student_id", studentId)
      .select()
      .single();
    if (attendanceUpdateError) throw new Error("Failed to update attendance");
    return attendanceUpdate;
  }

  static async getById(id: string) {
    const supabase = await createClient();
    const { data: attendanceData, error: attendanceDataError } = await supabase
      .from("timetables")
      .select(ATTENDANCE_SELECT)
      .eq("attendances.id", id)
      .single();
    if (attendanceDataError) throw new Error(attendanceDataError.message);

    return mapAttendance(
      attendanceData as unknown as Omit<AttendanceSession, "attendances"> & {
        attendances: RawAttendance[]
      }
    );
  }

  static async bulkUpdate(updates: Array<{ id: string; attendanceId: string; studentId: string; status: string; remark?: string | null }>) {
    const results = [];
    for (const update of updates) {
      const result = await this.updateAttendance(update);
      results.push(result);
    }
    return results;
  }


}
