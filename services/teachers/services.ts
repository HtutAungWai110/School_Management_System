import { createClient } from "@/lib/supabase/server.client";
import { BatchesService } from "../batches/services";

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
}
