import { createClient } from "@/lib/supabase/server.client";
import { m } from "motion/react";
import { s } from "motion/react-client";
import { NextRequest } from "next/server";
import { it } from "node:test";

const PAGE_SIZE = 20;

export class StudentsService {
  static async list(search: string, filter: string, page: number) {
    const supabase = await createClient();

    const recentSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
      .from("profiles")
      .select("*", { count: "exact" })
      .eq("role", "student")
      .range(from, to);

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

    const { count: assignedBatchesCount, error: batchesError } = await supabase
      .from("batches")
      .select("*", {count: "exact"})

    if (batchesError) {
      throw new Error(batchesError.message)
    }

    const { data: timetableData, error: timetableDataError } = await supabase
      .from("timetables")
      .select(`
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
        `)


    if (timetableDataError) {
      throw new Error(timetableDataError.message)
    }

    return { coursesEnrolledCount, assignedBatchesCount, timetableData }

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
        )
        `)
      .in("module_id", modulesFlatIds)
      .in("level_id", levelsFlatIds)

    if (moduleLevelsError) {
      throw new Error(moduleLevelsError.message)
    }

    const requiredValidMap = new Map()

    moduleLevelsData.forEach(item => {
      let level = requiredValidMap.get(item.levels.description)
      if (!level) {
        requiredValidMap.set(item.levels.description, { level: item.levels.description })
        level = { level: item.levels.description }
      }

      const required = item.required

      if (!level[required]) {
        level[required] = 1
      } else {
        level[required] = level[required] + 1
      }
      requiredValidMap.set(item.levels.description, level)
    })

    const levelModulesCombination = requiredValidMap.values().toArray()[0]

    if (levelModulesCombination.level === "Level 3 Diploma in Computing") {
      if (levelModulesCombination.core !== 5) {
        throw new Error("Invalid enrollment!")
      }
    } else if (levelModulesCombination.level === "Level 4 Diploma in Computing") {
      if (levelModulesCombination.core !== 5 || levelModulesCombination.mandatory !== 3) {
        throw new Error("Invalid enrollment!")
      }
    } else if (levelModulesCombination.level === "Level 4 Diploma in Computing with Business Management") {
      if (levelModulesCombination.core !== 4 || levelModulesCombination.mandatory !== 3 || levelModulesCombination.elective !== 1 ) {
        throw new Error("Invalid enrollment!")
      }
    } else if (levelModulesCombination.level === "Level 5 Diploma in Computing") {
      if (levelModulesCombination.specialist !== 4 || levelModulesCombination.elective !== 2) {
        throw new Error("Invalid enrollment!")
      }
    } else if (levelModulesCombination.level === "Level 5 Diploma in Computing with Business Management") {
      if (levelModulesCombination.core !== 4 || levelModulesCombination.elective !== 2) {
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

    return { enrollmentResults }
  }
}
