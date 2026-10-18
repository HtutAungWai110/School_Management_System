import { createClient } from "@/lib/supabase/server.client";
import { BatchesService } from "../batches/services";
import { ATTENDANCE_SELECT, buildFinalData, RawAttendance, toLocalDateString } from "../attendances/services";
import { ASSIGNMENT_SUBMISSIONS_SELECT } from "../assignments/services";
import { HttpError } from "@/lib/errors/http.error";
import type { Assignment } from "@/types/batch.type";
import type { AttendanceCalendarResponse, AttendanceSession, ClassHistoryEntry, ClassHistoryResponse } from "@/types/attendance.type";
import { TeacherModuleRow, TeacherModuleQueryRow } from "@/types/teacher-module.type";

const PAGE_SIZE = 20;

export class TeachersService {
  static async list(search: string, filter: string, page: number, id?: string) {
    const supabase = await createClient();

    const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("profiles")
      .select(`
        *,
        teacher_modules(
          id,
          assigned_at,
          modules(
            id,
            code,
            title
          )
        )
      `, { count: "exact" })
      .eq("role", "teacher")
      .range(from, to);

    if (id) {
      query = query.eq("id", id);
    }

    if (search) {
      query = query.ilike("full_name", `%${search}%`);
    }

    if (filter === "recent") {
      query = query.gte("created_at", recentSince);
    }

    query = query.order("created_at", { ascending: false });

    const { data: teachers, error } = await query;

    let countQuery = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher");

    if (id) {
      countQuery = countQuery.eq("id", id);
    }

    if (search) {
      countQuery = countQuery.ilike("full_name", `%${search}%`);
    }

    if (filter === "recent") {
      countQuery = countQuery.gte("created_at", recentSince);
    }

    const { count } = await countQuery;

    const { count: newTeachers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "teacher")
      .gte("created_at", recentSince);

    if (error) {
      throw new Error("Failed to fetch teachers");
    }

    const totalCount = count ?? 0;

    return { teachers, totalCount, newTeachers, page, totalPages: Math.ceil(totalCount / PAGE_SIZE) };
  }

  static async updateModules(teacherId: string, payload: Array<string>) {
    const supabase = await createClient();
    const { data: teacher_modules, error } = await supabase
      .from("teacher_modules")
      .select("*")
      .eq("teacher_id", teacherId);

    if (error) {
      throw new Error(error.message);
    }

    const existing = teacher_modules ?? [];

    const existingModuleIds = new Set(existing.map((tm) => tm.module_id));

    const addArray = payload.filter((moduleId) => !existingModuleIds.has(moduleId));

    const requestedIds = new Set(payload);

    const deleteArray = existing.filter((tm) => !requestedIds.has(tm.module_id));

    const addResults = await Promise.all(
      addArray.map((moduleId) =>
        supabase
          .from("teacher_modules")
          .insert({ teacher_id: teacherId, module_id: moduleId })
      )
    );

    const deleteResults = await Promise.all(
      deleteArray.map((tm) =>
        supabase
          .from("teacher_modules")
          .delete()
          .eq("teacher_id", teacherId)
          .eq("module_id", tm.module_id)
      )
    );

    return { addResults, deleteResults };
  }

  static async getOverview(ids?: string[]) {
    const supabase = await createClient();

    let timetableQuery = supabase
      .from("timetables")
      .select(`
        id,
        batch_id,
        batches(
          batch_name,
          status
        ),
        module_id,
        modules(
          code,
          title
        ),
        teacher_id,
        profiles:teacher_id(
          full_name
        ),
        class_id,
        day_of_week,
        start_time,
        end_time,
        status
        `)

    /* Narrowed in the query rather than after the fact: the student-count
       fan-out below runs per session, so filtering late would pay for the
       whole teacher's timetable to display two rows. */
    if (ids && ids.length > 0) {
      timetableQuery = timetableQuery.in("id", ids)
    }

    const { data: timetableData, error: timetableError } = await timetableQuery

    if (timetableError) throw new Error(timetableError.message)

    const timetableIds = timetableData.map(item => item.id)
    const batchModuleIds = timetableData.map(item => {
      return { batch_id: item.batch_id, module_id: item.module_id }
    })

    const studentCountMap: Map<string, number> = new Map();
    const totalUniqueStudentSet: Set<string> = new Set();

    const studentPromises = batchModuleIds.map(async (item) => {
      const studentsArray = await BatchesService.getStudents(item.batch_id, item.module_id)
      studentsArray.forEach((item: string) => {
        if (!totalUniqueStudentSet.has(item)) totalUniqueStudentSet.add(item)
      })
      const key = `${item.batch_id}_${item.module_id}`
      studentCountMap.set(key, studentsArray.length)
    })

    await Promise.all(studentPromises)

    const { count: totalSessions } = await supabase
      .from("attendances")
      .select("*", {count: 'exact', head: true})
      .in("timetable_id", timetableIds)


    const timetableSessions = timetableData.map(item => {
      const key = `${item.batch_id}_${item.module_id}`
      return {...item, batches: {...item.batches, count: studentCountMap.get(key)}}
    })

    const totalUniqueStudents: number = [...totalUniqueStudentSet].length

    return { totalSessions, timetableSessions, totalUniqueStudents };
  }

  static async getTimetableSessions(ids?: string[]) {
    try {
      const {timetableSessions} = await this.getOverview(ids)
      return timetableSessions
    } catch{
      throw new Error('Failed to get timetable sessions')
    }
  }

  static async getModules(): Promise<{ formattedData: TeacherModuleRow[] }> {
    const supabase = await createClient();

    const { data: modulesData, error: modulesError } = await supabase
      .from("teacher_modules")
      .select(`
        id,
        teacher_id,
        module_id,
        assigned_at,
        modules(
          code,
          title,
          modules_level(
            levels(
              id,
              description
            )
          )
        )
        `)

    if (modulesError) throw new Error(modulesError.message)

    const formattedData = ((modulesData || []) as unknown as TeacherModuleQueryRow[]).map((item) => {
      const modules = {
        code: item.modules.code,
        title: item.modules.title,
        levels: item.modules.modules_level.map((ml) => ({
          id: ml.levels.id,
          description: ml.levels.description
        }))
      }
      return {...item, modules}
    })

    return {formattedData}
  }

  static async getTimetableDetail(timetable_id: string) {
    const supabase = await createClient();
    const { data: timetableData, error: timetableError } = await supabase
      .from("timetables")
      .select(`
        id,
        batch_id,
        batches(
          batch_name,
          status
        ),
        module_id,
        modules(
          code,
          title
        ),
        teacher_id,
        profiles:teacher_id(
          full_name
        ),
        class_id,
        day_of_week,
        start_time,
        end_time,
        status
        `)
      .eq("id", timetable_id).single()

    if (timetableError) throw new Error(timetableError.message)

    const batchModuleIds = [{ batch_id: timetableData.batch_id, module_id: timetableData.module_id }]

    const studentCountMap: Map<string, number> = new Map();

    const studentPromises = batchModuleIds.map(async (item) => {
      const studentsArray = await BatchesService.getStudents(item.batch_id, item.module_id)
      const key = `${item.batch_id}_${item.module_id}`
      studentCountMap.set(key, studentsArray.length)
    })

    await Promise.all(studentPromises)

    const timetableDetail = { ...timetableData, batches: { ...timetableData.batches, count: studentCountMap.get(`${timetableData.batch_id}_${timetableData.module_id}`) } }


    return timetableDetail;
  }

  static async getTodayAttendance(timetable_id: string) {
    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0]

    const { data: attendanceData, error: attendanceDataError } = await supabase
      .from("attendances")
      .select("id")
      .eq("timetable_id", timetable_id)
      .eq("date", today)
      .maybeSingle()
    if (attendanceDataError) throw new Error(attendanceDataError.message);

    return attendanceData
  }

  static async getTimetableAttendances(timetable_id: string, date?: string | null): Promise<AttendanceCalendarResponse> {
    const supabase = await createClient();

    const query = supabase
      .from("timetables")
      .select(ATTENDANCE_SELECT)
      .eq("id", timetable_id);

    const { data: timetableIdsData, error: timetableError } = await supabase
      .from("timetables")
      .select("id")
      .eq("id", timetable_id);

    if (timetableError) {
      throw timetableError;
    }

    const timetableIds = timetableIdsData.map((item) => item.id);

    const { data: minDateRow } = await supabase
      .from("attendances")
      .select("date")
      .in("timetable_id", timetableIds)
      .order("date", { ascending: true })
      .limit(1)
      .maybeSingle();

    const { data: maxDateRow } = await supabase
      .from("attendances")
      .select("date")
      .in("timetable_id", timetableIds)
      .order("date", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!minDateRow) {
      return { finalData: [], minDate: null, maxDate: null };
    }

    const baseDate = date ? new Date(date) : new Date(maxDateRow?.date);
    const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    const startDateStr = toLocalDateString(startOfMonth);
    const endDateStr = toLocalDateString(endOfMonth);
    query
      .gte("attendances.date", startDateStr)
      .lte("attendances.date", endDateStr);

    const { data: attendanceData, error: attendanceDataError } = await query;
    if (attendanceDataError) throw new Error(attendanceDataError.message);

    const timetables = attendanceData as unknown as Array<
      Omit<AttendanceSession, "attendances"> & { attendances: RawAttendance[] }
    >;

    const finalData = buildFinalData(timetables);

    return {
      finalData,
      minDate: minDateRow?.date ?? null,
      maxDate: maxDateRow?.date ?? null,
    };
  }

  /** Every class session a given teacher has actually taught, for one month.
   *
   *  The teacher is a parameter rather than derived from the caller's session,
   *  so the same report serves a teacher reading their own record and an admin
   *  reading anyone's. Callers decide *which* id they may pass — the teacher
   *  endpoint resolves its own session id and ignores anything in the query
   *  string; an admin endpoint resolves the target from a validated uuid.
   *  RLS remains the backstop either way.
   *
   *  `attendances` drives the read and `timetables` is populated underneath it,
   *  rather than the other way round. Embedding attendance under each timetable
   *  costs a lookup per timetable — including for every session that was never
   *  taught — and drags the whole student roster along with it, none of which
   *  this report uses. Driving from attendance means a session appears exactly
   *  when it was actually run, and the row count is the teaching history.
   *
   *  The month defaults to the current one when the latest attendance falls in
   *  it, and otherwise to that latest attendance's own month — so a teacher who
   *  has not taught for weeks lands on their last real month rather than an
   *  empty one. An explicit `date` overrides both. */
  static async getClassHistory(teacherId: string, date?: string | null): Promise<ClassHistoryResponse> {
    const supabase = await createClient();

    /* Defensive rather than decorative: an undefined id would otherwise become
       `teacher_id = null` and silently match nothing, returning an empty report
       that reads as "this teacher has never taught". */
    if (!teacherId) {
      throw new HttpError(400, "A teacher id is required.");
    }

    /* Attendance hangs off timetable, so the teacher's sessions are the only
       ones whose attendance can be reachable from here. Resolved once and
       reused as an `in` filter rather than nested per row. */
    const { data: timetableIdsData, error: timetableError } = await supabase
      .from("timetables")
      .select("id")
      .eq("teacher_id", teacherId);

    if (timetableError) {
      throw timetableError;
    }

    const timetableIds = timetableIdsData.map((item) => item.id);

    /* No sessions assigned at all — an unbound teacher has nothing to page between. */
    if (timetableIds.length === 0) {
      return { finalData: [], minDate: null, maxDate: null, month: null };
    }

    const [{ data: minDateRow }, { data: maxDateRow }] = await Promise.all([
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

    const minDate = minDateRow?.date ?? null;
    const maxDate = maxDateRow?.date ?? null;

    /* Sessions assigned but none ever taught yet. */
    if (!minDate || !maxDate) {
      return { finalData: [], minDate, maxDate, month: null };
    }

    const today = new Date();
    const latest = new Date(maxDate + "T00:00:00");

    const baseDate = date
      ? new Date(date + "T00:00:00")
      : latest.getFullYear() === today.getFullYear() && latest.getMonth() === today.getMonth()
        ? today
        : latest;

    const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    const startDateStr = toLocalDateString(startOfMonth);
    const endDateStr = toLocalDateString(endOfMonth);

    const { data, error } = await supabase
      .from("attendances")
      .select(`
        id,
        date,
        timetables(
          id,
          module_id,
          batch_id,
          class_id,
          day_of_week,
          start_time,
          end_time,
          status,
          modules(
            id,
            code,
            title
          ),
          batches(
            id,
            batch_name
          ),
          classes(
            id,
            class_number
          ),
          profiles:teacher_id(
            id,
            full_name
          )
        )
      `)
      .in("timetable_id", timetableIds)
      .gte("date", startDateStr)
      .lte("date", endDateStr)
      .order("date", { ascending: false });

    if (error) throw new Error(error.message);

    return {
      finalData: (data ?? []) as unknown as ClassHistoryEntry[],
      minDate,
      maxDate,
      month: startDateStr,
    };
  }

  /** Everything this teacher has set, across every batch they teach, with the
   *  submissions attached. Scoped on teacher_id rather than batch_id, so one
   *  query covers all of their batches instead of one per batch. */
  static async getOwnAssignments(assignmentId?: string, submissionId?: string): Promise<Assignment[]> {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(userError.message);
    }

    const { user } = userData;

    if (!user) throw new HttpError(401, "Authentication required.");

    let query = supabase
      .from("assignments")
      .select(ASSIGNMENT_SUBMISSIONS_SELECT)
      .eq("teacher_id", user.id);

    /* Same two deep-link filters as the admin list, so a submission
       notification resolves on either side. Plain `.eq()` because PostgREST
       accepts an embedded column that way but rejects one inside `or()`. */
    if (assignmentId) {
      query = query.eq("id", assignmentId);
    }

    if (submissionId) {
      query = query.eq("student_assignments.id", submissionId);
    }

    const { data, error } = await query;

    if (error) throw new Error(error.message);

    return data as unknown as Assignment[];
  }
}
