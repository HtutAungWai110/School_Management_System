import { createClient } from "@/lib/supabase/server.client";
import { NotificationsService } from "@/services/notifications/services";
import { first } from "@/lib/supabase.util";

const PAGE_SIZE = 20;

/** A row from `modules_level`. Both embeds are unions because the untyped
 *  client models to-one relations as arrays; read them through `first()`. */
type ModuleLevelRow = {
  module_id: string
  level_id: string
  required: string
  levels: { description: string } | { description: string }[] | null
  modules: { code: string } | { code: string }[] | null
}


const TIMETABLE_SELECT = `
  *,
  batches(
    batch_name
  ),
  modules(
    title,
    code
  ),
  profiles(
    full_name,
    email
  ),
  classes(
    class_number,
    location
  )
  `

function normalizeTitle(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export class StudentsService {
  static async list(search: string, filter: string, page: number, id?: string) {
    const supabase = await createClient();

    const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .eq("role", "student")
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

    const { data: students, error } = await query;

    let countQuery = supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student");

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

    const { count: newEnrollments } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "student")
      .gte("created_at", recentSince);

    if (error) {
      throw new Error("Failed to fetch students");
    }

    const totalCount = count ?? 0;

    return { students, totalCount, newEnrollments, page, totalPages: Math.ceil(totalCount / PAGE_SIZE) };
  }

  static async getStudentOverview() {
    const supabase = await createClient();

    const { count: coursesEnrolledCount, error: courseEnrollmentError } = await supabase
      .from("student_enrollments")
      .select("module_id", {count: "exact"})

    if (courseEnrollmentError) {
      throw new Error(courseEnrollmentError.message)
    }

    const { data: assignedBatches, error: batchesError } = await supabase
      .from("batches")
      .select("*")

    if (batchesError) {
      throw new Error(batchesError.message)
    }

    const { data: timetableData, error: timetableDataError } = await supabase
      .from("timetables")
      .select(TIMETABLE_SELECT)


    if (timetableDataError) {
      throw new Error(timetableDataError.message)
    }

    return { coursesEnrolledCount, assignedBatches, timetableData }

  }

  static async getEnrollments() {
    const supabase = await createClient()

    const { data: enrollmentsData, error: enrollmentsError } = await supabase
      .from("student_enrollments")
      .select(`
        id,
        enrolled_at,
        status,
        modules(
          id,
          code,
          title
        ),
        levels(
          id,
          description
        )
        `)

    if (enrollmentsError) {
      throw new Error(enrollmentsError.message)
    }

    return { enrollments: enrollmentsData}
  }

  static async createEnrollment(body: Array<{ module_id: string, level_id: string }>) {
    const supabase = await createClient()

    const { data: userData, error: userError } = await supabase.auth.getUser()

    if (userError) {
      throw new Error(userError.message)
    }

    const { user } = userData

    const { data: pendingEnrollments, error: unassignedEnrollmentsError } = await supabase
      .from("student_enrollments")
      .select("id")
      .eq("student_id", user.id)
      .eq("status", "unassigned")
      .limit(1)

    if (unassignedEnrollmentsError) {
      throw new Error(unassignedEnrollmentsError.message)
    }

    if (pendingEnrollments && pendingEnrollments.length > 0) {
      throw new Error("You have pending enrollments for admin approval. You cannot enrolled anymore courses for now")
    }

    const { data: ongoingBatches, error: ongoingBatchError } = await supabase
      .from("batch_assignments")
      .select("id, batches!inner(status)")
      .eq("student_id", user.id)
      .eq("batches.status", "ongoing")
      .limit(1)

    if (ongoingBatchError) {
      throw new Error(ongoingBatchError.message)
    }

    if (ongoingBatches && ongoingBatches.length > 0) {
      throw new Error("The batch you are currently assigned to still ongoing. You cannot enrolled anymore courses for now")
    }

    const modulesFlatIds = body.map(item => {
      return item.module_id
    })

    const levelsFlatIds = body.map(item => {
      return item.level_id
    })

    const { data: moduleLevelsData, error: moduleLevelsError } = await supabase
      .from("modules_level")
      .select(`
        module_id,
        level_id,
        required,
        levels(
          description
        ),
        modules(
          code
        )
        `)
      .in("module_id", modulesFlatIds)
      .in("level_id", levelsFlatIds)

    if (moduleLevelsError) {
      throw new Error(moduleLevelsError.message)
    }

    // See `first()`: the untyped client models these embeds as arrays.
    const typedModuleLevels = moduleLevelsData as unknown as ModuleLevelRow[]

    // `level` is the qualification title; the rest are per-type tallies.
    type LevelCombination = { level: string } & Record<string, string | number>

    const requiredValidMap = new Map<string, LevelCombination>()

    typedModuleLevels.forEach(item => {
      const levelDescription = first<{ description: string }>(item.levels)?.description
      if (!levelDescription) return

      let entry = requiredValidMap.get(levelDescription)
      if (!entry) {
        entry = { level: levelDescription }
        requiredValidMap.set(levelDescription, entry)
      }

      const required = item.required

      if (!entry[required]) {
        entry[required] = 1
      } else {
        entry[required] = Number(entry[required]) + 1
      }
    })

    const levelModulesCombination = Array.from(requiredValidMap.values())[0]

    if (!levelModulesCombination) {
      throw new Error("Invalid enrollment!")
    }

    // Level titles come from the DB and their casing has varied ("LEVEL 3"
    // vs "Level 3"), so compare normalised rather than by exact string.
    const levelKey = normalizeTitle(levelModulesCombination.level)

    if (levelKey === "level 3 diploma in computing") {
      if (levelModulesCombination.core !== 5) {
        throw new Error("Invalid enrollment!")
      }
    } else if (levelKey === "level 4 diploma in computing") {
      if (levelModulesCombination.core !== 5 || levelModulesCombination.mandatory !== 3) {
        throw new Error("Invalid enrollment!")
      }
    } else if (levelKey === "level 4 diploma in computing with business management") {
      if (levelModulesCombination.core !== 4 || levelModulesCombination.mandatory !== 3 || levelModulesCombination.elective !== 1 ) {
        throw new Error("Invalid enrollment!")
      }
    } else if (levelKey === "level 5 diploma in computing") {
      if (levelModulesCombination.specialist !== 4 || levelModulesCombination.elective !== 2) {
        throw new Error("Invalid enrollment!")
      }
    } else if (levelKey === "level 5 diploma in computing with business management") {
      // level-rules.md specifies 4 specialist + 2 elective for this diploma.
      if (levelModulesCombination.specialist !== 4 || levelModulesCombination.elective !== 2) {
        throw new Error("Invalid enrollment!")
      }
    } else {
      throw new Error("Invalid enrollment!")
    }

    const enrollmentPromise = body.map(item => {
      return supabase.from('student_enrollments').insert({
        student_id: user.id,
        module_id: item.module_id,
        level_id: item.level_id,
      })
    })

    const enrollmentResults = await Promise.all(enrollmentPromise)

    /* Every row is created as `unassigned`, so nothing moves until an admin
       approves it. This is the prompt, and it lands them on the enrollments
       queue filtered to this student. */
    const failed = enrollmentResults.filter((result) => result.error)
    if (failed.length === 0) {
      await this.notifyAdminsOfEnrollment(user.id, moduleLevelsData as unknown as ModuleLevelRow[])
    }

    return { enrollmentResults }
  }

  private static async notifyAdminsOfEnrollment(studentId: string, moduleLevels: ModuleLevelRow[]) {
    try {
      const supabase = await createClient()

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", studentId)
        .maybeSingle()

      if (profileError || !profile) return

      const moduleCodes: string[] = []
      for (const row of moduleLevels) {
        const code = first<{ code?: string | null }>(row.modules)?.code
        if (code && !moduleCodes.includes(code)) moduleCodes.push(code)
      }

      await NotificationsService.notifyAdminsOfEnrollmentRequest({
        studentId,
        studentName: profile.full_name,
        moduleCodes: moduleCodes.sort(),
        level: first<{ description?: string | null }>(moduleLevels[0]?.levels)?.description ?? null,
      })
    } catch (error) {
      // Never fail a successful enrolment because the announcement did not send.
      console.error("[notifications] enrollment request failed:", error)
    }
  }

  static async getTimetables(ids?: string[]) {
    const supabase = await createClient()

    let query = supabase
      .from("timetables")
      .select(TIMETABLE_SELECT)

    /* Accepts the parameter repeated, matching the admin and teacher timetable
       lists: a swap links to two sessions at once. RLS already confines a
       student to their own batches, so a foreign id simply matches nothing. */
    if (ids && ids.length > 0) {
      query = query.in("id", ids)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(error.message)
    }

    return data
  }

  static async getBatches() {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("batches")
      .select(`
        *,
        batch_level(
          levels(
            description
          )
        )
        `)

    if (error) throw new Error(error.message)

    const finalData = data?.map(item => {
      const { id, batch_name, created_at, status, batch_level } = item
      const levels = batch_level?.map((bl: {levels: {description: string}}) => {
        return bl.levels.description
      })

      return {id, batch_name, created_at, status, levels}
    })

    return finalData
  }

  static async getBatchDetail(id: string) {
    const supabase = await createClient()

    const { data: batchData, error: batchError } = await supabase
      .from("batches")
      .select(`
        *,
        batch_level(
          levels(
            description
          )
        )
        `)
      .eq("id", id)
      .maybeSingle()

    if (batchError) throw new Error(batchError.message)

    const { data: batchAssignmentsData, error: batchAssignmentsError } = await supabase
      .rpc("get_batch_students", { p_batch_id: id })

    if (batchAssignmentsError) throw new Error(batchAssignmentsError.message)

    const { id: batchId, batch_name, created_at, status, batch_level } = batchData

    const formattedBatchData = {
      id: batchId,
      batch_name,
      created_at,
      status,
      levels: batch_level.map((bl: { levels: { description: string } }) => {
        return bl.levels.description
      })
    }

    const finalData = {
      ...formattedBatchData,
      students: batchAssignmentsData
    }


    return finalData

  }
}
