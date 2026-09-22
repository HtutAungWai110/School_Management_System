import { createClient } from "@/lib/supabase/server.client";
import { BatchesService } from "../batches/services";
import { ATTENDANCE_SELECT, buildFinalData, RawAttendance } from "../attendances/services";
import type { AttendanceCalendarResponse, AttendanceSession } from "@/types/attendance.type";
import { TeacherModuleRow, TeacherModuleQueryRow } from "@/types/teacher-module.type";

const PAGE_SIZE = 20;

export class TeachersService {
  static async list(search: string, filter: string, page: number) {
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

  static async getOverview() {
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

  static async getTimetableSessions() {
    try {
      const {timetableSessions} = await this.getOverview()
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
    const startDateStr = startOfMonth.toISOString().split("T")[0];
    const endDateStr = endOfMonth.toISOString().split("T")[0];
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
}
