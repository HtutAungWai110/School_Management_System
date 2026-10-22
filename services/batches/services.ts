import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";
import { NotificationsService } from "@/services/notifications/services";
import type { BatchStatus, BatchAssignment, BatchListItem, BatchModule, BatchTeacherModule, Assignment } from "@/types/batch.type";
import type { Announcement, AnnouncementAttachments, AnnouncementAuthor, AnnouncementComment } from "@/types/announcement.type";

const BATCH_SELECT = `
  id,
  batch_name,
  status,
  created_at,
  batch_level (
    id,
    level_id,
    levels (
      id,
      description
    )
  ),
  batch_assignments (count)
`;

const BATCH_DETAIL_SELECT = `
  id,
  batch_name,
  status,
  created_at,
  batch_level (
    id,
    level_id,
    levels (
      id,
      description
    )
  ),
  timetables(
    id,
    day_of_week,
    start_time,
    end_time,
    status,
    modules(
      id,
      code,
      title
    ),
    profiles(
      id,
      full_name,
      email,
      phone,
      avatar_url
    ),
    classes(
      id,
      class_number,
      location
    )
  )
`;

const STUDENT_ENROLLMENTS_SELECT = `
  id,
  student_id,
  assigned_at,
  profiles (
    id,
    full_name,
    email,
    phone,
    avatar_url,
    student_enrollments(
      id,
      level_id,
      modules(
        id,
        code,
        title
      )
    )
  )
`;

const ANNOUNCEMENT_BUCKET = "batch_announcements";

/* Author summaries are resolved separately through `get_profile_summaries`:
   `profiles` is no longer readable by non-admins, and embedding the FK here
   silently returned `profiles: null` for every student and teacher. */
const ANNOUNCEMENT_SELECT = `
  id,
  batch_id,
  author_id,
  content,
  attachments,
  likes_count,
  comments_count,
  created_at,
  updated_at
`;

type AnnouncementRow = Omit<Announcement, "profiles">;

/** Raw GET /api/batches row: the only assignment data selected is an
 *  aggregate count, which is flattened to `student_count` before returning. */
type BatchListRow = Omit<BatchListItem, "student_count"> & {
  batch_assignments: { count: number }[] | null;
};

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Storage keys held by a stored `attachments` blob. */
function storedImagePaths(attachments: unknown): string[] {
  if (!attachments || typeof attachments !== "object") return [];

  const images = (attachments as { images?: unknown }).images;
  if (!Array.isArray(images)) return [];

  return images
    .map((image) =>
      image && typeof image === "object" ? (image as { path?: unknown }).path : null
    )
    .filter((path): path is string => typeof path === "string" && path.length > 0);
}

/**
 * Best effort on purpose. Every caller reaches this after the row already
 * points elsewhere; throwing here would report a save that did succeed. The
 * worst case is an unreferenced object, which is cheaper than a false failure.
 */
async function removeFromBucket(supabase: ServerSupabase, paths: string[]) {
  if (paths.length === 0) return;

  /* Supabase reports storage failures as `{ error }` rather than throwing, so
     ignoring the result would hide a policy regression behind a successful
     save. The row is already committed either way, so this must not throw. */
  try {
    const { error } = await supabase.storage.from(ANNOUNCEMENT_BUCKET).remove(paths);

    if (error) {
      console.error("Could not remove announcement images from storage:", error.message);
    }
  } catch (error) {
    console.error("Could not remove announcement images from storage:", error);
  }
}

async function signedInUserId(supabase: ServerSupabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, "You must be signed in to continue");
  }

  return user.id;
}

/**
 * 404s unless the announcement exists in that batch *and* the caller's RLS can
 * see it.
 *
 * The second half matters for writes: the comment and like insert policies
 * only check `profile_id`, so visibility has to be enforced here before a row
 * is attached to a post the caller is not in the audience for.
 */
async function assertAnnouncementVisible(
  supabase: ServerSupabase,
  batchId: string,
  announcementId: string
) {
  const { data, error } = await supabase
    .from("batch_announcements")
    .select("id")
    .eq("id", announcementId)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, "That announcement no longer exists");
}

/**
 * Looks up the display fields for a set of authors.
 *
 * `profiles` is no longer readable by non-admins, so this goes through the
 * security-definer helper that exposes exactly id, full_name and avatar_url.
 */
async function loadProfileSummaries(
  supabase: ServerSupabase,
  ids: string[]
): Promise<Map<string, AnnouncementAuthor>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_profile_summaries", {
    p_ids: uniqueIds,
  });

  if (error) throw new Error(error.message);

  return new Map(
    ((data ?? []) as AnnouncementAuthor[]).map((profile) => [profile.id, profile])
  );
}

/** Attaches the author summary to announcement rows fetched without the FK. */
async function withAnnouncementAuthors(
  supabase: ServerSupabase,
  rows: AnnouncementRow[]
): Promise<Announcement[]> {
  const authorIds = rows
    .map((row) => row.author_id)
    .filter((id): id is string => Boolean(id));
  const authors = await loadProfileSummaries(supabase, authorIds);

  return rows.map((row) => ({
    ...row,
    profiles: row.author_id ? authors.get(row.author_id) ?? null : null,
  }));
}

async function loadAnnouncement(
  supabase: ServerSupabase,
  row: AnnouncementRow | null
): Promise<Announcement | null> {
  if (!row) return null;

  const [announcement] = await withAnnouncementAuthors(supabase, [row]);
  return announcement ?? null;
}

/**
 * Reads the row and proves the caller wrote it.
 *
 * `batch_announcements` lets any admin write any row, which is the right rule
 * for moderation but wrong for these routes: the noticeboard menu is offered
 * only to the author, so the API has to agree.
 */
async function readAuthoredAnnouncement(
  supabase: ServerSupabase,
  batchId: string,
  announcementId: string,
  userId: string,
  action: "edit" | "delete"
) {
  const { data, error } = await supabase
    .from("batch_announcements")
    .select("author_id, attachments")
    .eq("id", announcementId)
    .eq("batch_id", batchId)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) throw new HttpError(404, "That announcement no longer exists");

  if (data.author_id !== userId) {
    throw new HttpError(403, `Only the author can ${action} this announcement`);
  }

  return data as { author_id: string | null; attachments: unknown };
}

export class BatchesService {
  static async list(search: string, status: string): Promise<BatchListItem[]> {
    const supabase = await createClient();

    let query = supabase
      .from("batches")
      .select(BATCH_SELECT)
      .order("created_at", { ascending: false });

    if (search) {
      query = query.ilike("batch_name", `%${search}%`);
    }

    if (status === "ongoing" || status === "completed") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return ((data ?? []) as unknown as BatchListRow[]).map(
      ({ batch_assignments, ...batch }) => ({
        ...batch,
        student_count: batch_assignments?.[0]?.count ?? 0,
      })
    );
  }

  static async getById(id: string) {
    const supabase = await createClient();

    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .select(BATCH_DETAIL_SELECT)
      .eq("id", id)
      .single();

    if (batchError) {
      throw new Error(batchError.message);
    }

    const batchLevelIds = new Set((batch.batch_level ?? []).map((bl) => bl.level_id));

    if (batchLevelIds.size > 0) {
      const { data: assignments, error: assignmentsError } = await supabase
        .from("batch_assignments")
        .select(STUDENT_ENROLLMENTS_SELECT)
        .eq("batch_id", id);

      if (assignmentsError) {
        throw new Error(assignmentsError.message);
      }

      const filteredAssignments = (assignments ?? []).map((assignment: { id: string; student_id: string; assigned_at: string; profiles: unknown }) => {
        const profile = assignment.profiles as { id: string; full_name: string; email: string; phone: string; avatar_url: string | null; student_enrollments: { level_id: string }[] } | null;
        if (!profile) return assignment;

        const filteredEnrollments = (profile.student_enrollments ?? []).filter(
          (enrollment: { level_id: string }) => batchLevelIds.has(enrollment.level_id)
        );

        return {
          ...assignment,
          profiles: {
            ...profile,
            student_enrollments: filteredEnrollments,
          },
        } as BatchAssignment;
      });

      return {
        ...batch,
        batch_assignments: filteredAssignments,
      };
    }

    return batch;
  }

  static async create(batchName: string, levelIds: string[]) {
    const supabase = await createClient();

    const uniqueLevelIds = [...new Set(levelIds)];

    const { data: existingLevels, error: levelsCheckError } = await supabase
      .from("levels")
      .select("id")
      .in("id", uniqueLevelIds);

    if (levelsCheckError) {
      throw new Error(levelsCheckError.message);
    }

    if ((existingLevels ?? []).length !== uniqueLevelIds.length) {
      throw new HttpError(400, "Invalid level provided");
    }

    const { data: batch, error: batchError } = await supabase
      .from("batches")
      .insert({ batch_name: batchName.trim() })
      .select()
      .single();

    if (batchError) {
      throw new Error(batchError.message);
    }

    const levelRows = uniqueLevelIds.map((level_id) => ({
      level_id,
      batch_id: batch.id,
    }));

    const { error: levelsError } = await supabase.from("batch_level").insert(levelRows);

    if (levelsError) {
      await supabase.from("batches").delete().eq("id", batch.id);
      throw new Error(levelsError.message);
    }

    return batch;
  }

  static async update(id: string, payload: { batch_name?: string; status?: BatchStatus }) {
    const supabase = await createClient();

    const changes: Record<string, string> = {};
    if (payload.batch_name !== undefined) changes.batch_name = payload.batch_name.trim();
    if (payload.status !== undefined) changes.status = payload.status;

    const { data, error } = await supabase
      .from("batches")
      .update(changes)
      .eq("id", id)
      .select();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async removeAssignment(assignmentId: string, batchId: string) {
    const supabase = await createClient();

    const { data: assignment, error: assignmentError } = await supabase
      .from("batch_assignments")
      .select("student_id")
      .eq("id", assignmentId)
      .single();

    if (assignmentError) {
      throw new Error(assignmentError.message);
    }

    const { data: batchData, error: batchError } = await supabase
      .from("batches")
      .select(`
        id,
        batch_level(
          level_id
        )
      `)
      .eq("id", batchId)
      .single();

    if (batchError) {
      throw new Error(batchError.message);
    }

    const batchLevelIds = (batchData.batch_level ?? []).map((bl) => bl.level_id);

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from("student_enrollments")
      .select("module_id")
      .eq("student_id", assignment.student_id)
      .in("level_id", batchLevelIds);

    if (enrollmentsError) {
      throw new Error(enrollmentsError.message);
    }

    const moduleIds = (enrollments ?? []).map((e) => e.module_id);

    const { error } = await supabase
      .from("batch_assignments")
      .delete()
      .eq("id", assignmentId);

    if (error) {
      throw new Error(error.message);
    }

    if (moduleIds.length > 0) {
      const { error: updateError } = await supabase
        .from("student_enrollments")
        .update({ status: "unassigned" })
        .eq("student_id", assignment.student_id)
        .in("module_id", moduleIds);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return { success: true };
  }

  static async bulkRemoveAssignments(assignmentIds: string[], batchId: string) {
    for (const assignmentId of assignmentIds) {
      await this.removeAssignment(assignmentId, batchId);
    }

    return { success: true, removed: assignmentIds.length };
  }

  static async remove(id: string) {
    const supabase = await createClient();

    const { error: levelsError } = await supabase
      .from("batch_level")
      .delete()
      .eq("batch_id", id);

    if (levelsError) {
      throw new Error(levelsError.message);
    }

    const { error: assignmentsError } = await supabase
      .from("batch_assignments")
      .delete()
      .eq("batch_id", id);

    if (assignmentsError) {
      throw new Error(assignmentsError.message);
    }

    const { error } = await supabase
      .from("batches")
      .delete()
      .eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
  }

  static async getBatchModules(
    batchId: string
  ): Promise<BatchModule[]> {
    const supabase = await createClient();

    const { data: batchLevelData, error: batchLevelError } = await supabase
      .from("batch_level")
      .select("level_id, batch_id")
      .eq("batch_id", batchId);

    if (batchLevelError) {
      throw new Error(batchLevelError.message);
    }

    const { data: batchModulesData, error: batchModulesError } = await supabase
      .from("batch_assignments")
      .select(`
        batch_id,
        profiles(
          student_enrollments(
            module_id,
            level_id,
            modules(
              id,
              code,
              title
            )
          )
        )
      `)
      .eq("batch_id", batchId);

    if (batchModulesError) {
      throw new Error(batchModulesError.message);
    }

    const batchLevelIds = new Set(batchLevelData.map((item) => item.level_id));
    const moduleIds = new Set<string>();
    const modules: BatchModule[] = [];

    const flatModules = (batchModulesData ?? []).flatMap(
      (item) => (item.profiles as unknown as { student_enrollments: { module_id: string; level_id: string; modules: BatchModule | null }[] } | null)?.student_enrollments ?? []
    );

    for (const enrollment of flatModules) {
      if (batchLevelIds.has(enrollment.level_id) && !moduleIds.has(enrollment.module_id) && enrollment.modules) {
        moduleIds.add(enrollment.module_id);
        modules.push(enrollment.modules);
      }
    }

    return modules;
  }
  static async getTeacherModules(
    batchId: string
  ): Promise<BatchTeacherModule[]> {
    const supabase = await createClient();


    const { data: batchModulesData, error: batchModulesError } = await supabase
      .from("batch_level")
      .select(`
        batch_id,
        levels(
          modules_level(
            modules(
              id,
              code,
              title
            )
          )
        )
      `)
      .eq("batch_id", batchId);

    if (batchModulesError) {
      throw new Error(batchModulesError.message);
    }

    const flatIds = Array.from(
      new Set(
        (batchModulesData ?? [])
          .flatMap((item) => (item.levels as unknown as { modules_level: { modules: { id: string } | null }[] | null } | null)?.modules_level ?? [])
          .map((moduleLevel) => moduleLevel.modules?.id)
          .filter((moduleId): moduleId is string => Boolean(moduleId))
      )
    );

    if (flatIds.length === 0) {
      return [];
    }

    const {data: teacherModules, error: teacherModulesError} = await supabase
      .from("teacher_modules")
      .select(`
        profiles(
          id,
          full_name,
          email
        ),
        modules(
          id,
          code,
          title
        )
      `)
      .in("module_id", flatIds);

    if (teacherModulesError) {
      throw new Error(teacherModulesError.message);
    }

    return (teacherModules ?? []) as unknown as BatchTeacherModule[];

  }

  static async getStudents(batchId: string, moduleId: string): Promise<string[]> {
    const supabase = await createClient();

    const { data: batchStudentsData, error: batchStudentsError } = await supabase
      .from("batch_assignments")
      .select("profiles(id)")
      .eq("batch_id", batchId);

    if (batchStudentsError) throw batchStudentsError;

    const studentIds = batchStudentsData
      .map((item) => (item.profiles as unknown as { id: string } | null)?.id)
      .filter((id): id is string => Boolean(id));

    const { data: targetStudentsData, error: targetStudentsError } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .in("student_id", studentIds)
      .eq("module_id", moduleId)
      .eq("status", "assigned");

    if (targetStudentsError) throw targetStudentsError;

    return targetStudentsData.map((item) => item.student_id);
  }

  static async getStudentCount(batchId: string, moduleId: string): Promise<number>{
    const students = await this.getStudents(batchId, moduleId)
    const studentCount = students.length
    return studentCount;
  }

  static async createAssignment(
    batchId: string,
    moduleId: string,
    teacherId: string,
    deadlineAt: string | null = null
  ) {
    const supabase = await createClient();

    const { data: timetableData, error: timetableError } = await supabase
      .from("timetables")
      .select("id")
      .eq("batch_id", batchId)
      .eq("module_id", moduleId)
      .eq("teacher_id", teacherId)
      .maybeSingle();

    if (timetableError) {
      throw new Error(timetableError.message);
    }

    if (!timetableData) {
      throw new HttpError(400, "No timetable entry found for this batch, module, and teacher");
    }

    const { data, error } = await supabase
      .from("assignments")
      .insert({
        batch_id: batchId,
        module_id: moduleId,
        teacher_id: teacherId,
        deadline_at: deadlineAt,
      })
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  static async getAssignments(batchId: string): Promise<Assignment[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("assignments")
      .select(`
        id,
        batch_id,
        module_id,
        teacher_id,
        created_at,
        deadline_at,
        modules (
          id,
          code,
          title
        ),
        profiles (
          id,
          full_name,
          email,
          phone
        ),
        student_assignments (
          id,
          assignment_id,
          student_id,
          turned_in_at,
          file_path,
          file_name,
          profiles (
            id,
            full_name,
            email,
            phone
          )
        )
      `)
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as unknown as Assignment[];
  }

  static async getAnnouncements(batchId: string): Promise<Announcement[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("batch_announcements")
      .select(ANNOUNCEMENT_SELECT)
      .eq("batch_id", batchId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return withAnnouncementAuthors(
      supabase,
      (data ?? []) as unknown as AnnouncementRow[]
    );
  }

  static async createAnnouncement(
    batchId: string,
    content: string | null,
    attachments: AnnouncementAttachments
  ): Promise<Announcement> {
    const supabase = await createClient();

    /* The author is taken from the session, never from the request body: a
       caller must not be able to publish a notice under someone else's name. */
    const userId = await signedInUserId(supabase);

    /* Authorization is the table's admin-only RLS policy, not a role check
       here: the same rule then guards this route, the browser, and any future
       caller instead of being re-stated in each one. */
    const { data, error } = await supabase
      .from("batch_announcements")
      .insert({ batch_id: batchId, author_id: userId, content, attachments })
      .select(ANNOUNCEMENT_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const announcement = await loadAnnouncement(
      supabase,
      data as unknown as AnnouncementRow
    );

    if (!announcement) {
      throw new Error("The announcement could not be reloaded after publishing.");
    }

    /* The row is committed; delivery is a follow-up. `notifyAnnouncementPosted`
       never throws, so a failed fan-out cannot report a post that did happen as
       an error. */
    await NotificationsService.notifyAnnouncementPosted({
      batchId,
      announcementId: announcement.id,
      content,
      actorId: userId,
    });

    return announcement;
  }

  static async getAnnouncement(
    batchId: string,
    announcementId: string
  ): Promise<Announcement | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("batch_announcements")
      .select(ANNOUNCEMENT_SELECT)
      .eq("id", announcementId)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return loadAnnouncement(supabase, (data as AnnouncementRow | null) ?? null);
  }

  static async isAnnouncementLiked(batchId: string, announcementId: string): Promise<boolean> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);

    /* The embedded filter makes a wrong batch id answer "not liked" and, via
       the announcement's own RLS, refuses posts the caller cannot see. */
    const { data, error } = await supabase
      .from("batch_announcements_likes")
      .select("id, batch_announcements!inner(batch_id)")
      .eq("announcement_id", announcementId)
      .eq("profile_id", userId)
      .eq("batch_announcements.batch_id", batchId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data);
  }

  /**
   * Sets the viewer's like to `liked` and reports the counter afterwards.
   *
   * Idempotent on purpose: an optimistic button can repeat a request, so a
   * second like is a no-op and a second dislike deletes nothing.
   */
  static async setAnnouncementLike(
    batchId: string,
    announcementId: string,
    liked: boolean
  ): Promise<{ liked: boolean; likes_count: number }> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);

    /* Reading the post first turns an unknown id into a 404 instead of a
       foreign-key 500, and its RLS proves the caller is in the audience. */
    await assertAnnouncementVisible(supabase, batchId, announcementId);

    if (liked) {
      /* The unique key makes a repeated tap a no-op rather than an error, and
         a skipped insert leaves the trigger's counter untouched. */
      const { error } = await supabase.from("batch_announcements_likes").upsert(
        { announcement_id: announcementId, profile_id: userId },
        { onConflict: "announcement_id,profile_id", ignoreDuplicates: true }
      );

      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("batch_announcements_likes")
        .delete()
        .eq("announcement_id", announcementId)
        .eq("profile_id", userId);

      if (error) throw new Error(error.message);
    }

    /* The trigger owns the counter, so the response reports what the table
       actually holds instead of a number guessed by the client. */
    const { data: counts, error: countError } = await supabase
      .from("batch_announcements")
      .select("likes_count")
      .eq("id", announcementId)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (countError) throw new Error(countError.message);

    return {
      liked,
      likes_count: (counts as { likes_count: number } | null)?.likes_count ?? 0,
    };
  }

  /**
   * One page of everyone else's comments, oldest first.
   *
   * The signed-in user's own comments are served separately so the client can
   * pin them above the rest; the count here is the "others" total, which is
   * what drives the load-more control.
   */
  static async getAnnouncementComments(
    batchId: string,
    announcementId: string,
    page: number,
    limit: number
  ): Promise<{ data: AnnouncementComment[]; total: number }> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);
    await assertAnnouncementVisible(supabase, batchId, announcementId);

    const from = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("batch_announcements_comments")
      .select("id, announcement_id, profile_id, parent_id, content, created_at", {
        count: "exact",
      })
      .eq("announcement_id", announcementId)
      .neq("profile_id", userId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + limit - 1);

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<Omit<AnnouncementComment, "author">>;
    const authors = await loadProfileSummaries(
      supabase,
      rows.map((row) => row.profile_id)
    );

    return {
      data: rows.map((row) => ({
        ...row,
        author: authors.get(row.profile_id) ?? null,
      })),
      total: count ?? 0,
    };
  }

  /** The signed-in user's comments on one announcement, newest first. */
  static async getOwnAnnouncementComments(
    batchId: string,
    announcementId: string
  ): Promise<{ data: AnnouncementComment[]; total: number }> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);
    await assertAnnouncementVisible(supabase, batchId, announcementId);

    const { data, error, count } = await supabase
      .from("batch_announcements_comments")
      .select("id, announcement_id, profile_id, parent_id, content, created_at", {
        count: "exact",
      })
      .eq("announcement_id", announcementId)
      .eq("profile_id", userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<Omit<AnnouncementComment, "author">>;
    const authors = await loadProfileSummaries(supabase, [userId]);

    return {
      data: rows.map((row) => ({
        ...row,
        author: authors.get(row.profile_id) ?? null,
      })),
      total: count ?? rows.length,
    };
  }

  static async createAnnouncementComment(
    batchId: string,
    announcementId: string,
    content: string
  ): Promise<{ data: AnnouncementComment; comments_count: number }> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);
    await assertAnnouncementVisible(supabase, batchId, announcementId);

    const { data, error } = await supabase
      .from("batch_announcements_comments")
      .insert({ announcement_id: announcementId, profile_id: userId, content })
      .select("id, announcement_id, profile_id, parent_id, content, created_at")
      .single();

    if (error) throw new Error(error.message);

    const authors = await loadProfileSummaries(supabase, [userId]);
    const comment = data as Omit<AnnouncementComment, "author">;

    /* The trigger has already counted the row by now, so the response can
       update the button without a second round trip from the client. */
    const { data: counts, error: countError } = await supabase
      .from("batch_announcements")
      .select("comments_count")
      .eq("id", announcementId)
      .eq("batch_id", batchId)
      .maybeSingle();

    if (countError) throw new Error(countError.message);

    return {
      data: { ...comment, author: authors.get(userId) ?? null },
      comments_count: (counts as { comments_count: number } | null)?.comments_count ?? 0,
    };
  }

  static async updateAnnouncement(
    batchId: string,
    announcementId: string,
    content: string | null,
    attachments: AnnouncementAttachments
  ): Promise<Announcement> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);
    const existing = await readAuthoredAnnouncement(
      supabase,
      batchId,
      announcementId,
      userId,
      "edit"
    );

    const { data, error } = await supabase
      .from("batch_announcements")
      .update({ content, attachments, updated_at: new Date().toISOString() })
      .eq("id", announcementId)
      .eq("batch_id", batchId)
      .eq("author_id", userId)
      .select(ANNOUNCEMENT_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    /* Only keys that were stored and are no longer referenced are removed. The
       request cannot nominate an arbitrary object for deletion, and an upload
       that failed midway leaves the previous row intact. */
    const kept = new Set(attachments.images.map((image) => image.path));
    const removed = storedImagePaths(existing.attachments).filter((path) => !kept.has(path));
    await removeFromBucket(supabase, removed);

    const announcement = await loadAnnouncement(
      supabase,
      data as unknown as AnnouncementRow
    );

    if (!announcement) {
      throw new Error("The announcement could not be reloaded after saving.");
    }

    return announcement;
  }

  static async deleteAnnouncement(batchId: string, announcementId: string): Promise<void> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);
    const existing = await readAuthoredAnnouncement(
      supabase,
      batchId,
      announcementId,
      userId,
      "delete"
    );

    /* Likes and comments go with the row through ON DELETE CASCADE, so their
       counters never have to be adjusted by hand. */
    const { error } = await supabase
      .from("batch_announcements")
      .delete()
      .eq("id", announcementId)
      .eq("batch_id", batchId)
      .eq("author_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    await removeFromBucket(supabase, storedImagePaths(existing.attachments));
  }
}
