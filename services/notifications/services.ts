import { createClient } from "@/lib/supabase/server.client";
import {
  assignmentNotificationLink,
  buildAssignmentSubmittedMessage,
  buildBatchAssignedMessage,
  buildEnrollmentRequestMessage,
  buildTeacherCheckInMessage,
  buildTimetableNotificationMessage,
  timetableNotificationLink,
  type CheckInSession,
  type TimetableAction,
  type TimetableSessionRef,
} from "@/lib/notification.util";
import type { CreateNotificationPayload, NotificationRow } from "@/types/notification.type";

const TIMETABLE_TYPE: Record<TimetableAction, CreateNotificationPayload["type"]> = {
  scheduled: "timetable_scheduled",
  updated: "timetable_updated",
  swapped: "timetable_swapped",
};

type Recipient = {
  id: string;
  role: string;
};

export class NotificationsService {
  /**
   * Writes one notification for a single recipient via the
   * `create_notification` RPC.
   *
   * That RPC is the only write path: `notifications` has RLS enabled with no
   * INSERT policy, so a direct insert from the app matches nothing. Callers
   * loop over recipients; this stays a single-recipient call on purpose so one
   * failing inbox cannot roll back the others.
   */
  static async create({ data, senderIds, recipientId, type }: CreateNotificationPayload) {
    const supabase = await createClient();

    const { data: inserted, error } = await supabase.rpc("create_notification", {
      p_recipient_id: recipientId,
      p_type: type,
      p_data: data,
      p_sender_ids: senderIds.length > 0 ? senderIds : [],
    });

    if (error) {
      throw new Error(error.message);
    }

    return (inserted as NotificationRow[] | null) ?? [];
  }

  /**
   * Announces a timetable change to whoever is not responsible for it.
   *
   * An admin scheduling, editing or swapping is news for the teacher involved;
   * a teacher doing the same is news for the admins. Each side is told about
   * the other's edits so both views of the timetable stay in agreement.
   *
   * Never throws: the timetable write has already succeeded, so failing the
   * request now would report an error for work that was actually saved.
   */
  static async notifyTimetableChange({
    action,
    actorId,
    actorRole,
    actorName,
    sessions,
  }: {
    action: TimetableAction;
    actorId: string;
    actorRole: string;
    actorName: string;
    sessions: TimetableSessionRef[];
  }) {
    if (sessions.length === 0) return;

    const supabase = await createClient();
    const recipients: Recipient[] = [];

    if (actorRole === "admin") {
      /* Skip the actor: an admin editing a session they teach themselves should
         not be told about their own edit. */
      const teacherIds = new Set(
        sessions.map((session) => session.teacherId).filter((id): id is string => Boolean(id) && id !== actorId)
      );

      if (teacherIds.size > 0) {
        const { data: teachers, error } = await supabase
          .from("profiles")
          .select("id, role")
          .in("id", [...teacherIds]);

        if (error) {
          console.error("[notifications] teacher lookup failed:", error.message);
          return;
        }

        for (const teacher of teachers ?? []) {
          recipients.push({ id: teacher.id, role: teacher.role });
        }
      }
    } else if (actorRole === "teacher") {
      const { data: adminIds, error } = await supabase.rpc("get_admin_ids");

      if (error) {
        console.error("[notifications] get_admin_ids failed:", error.message);
        return;
      }

      for (const row of (adminIds ?? []) as Array<{ profile_id: string }>) {
        if (row.profile_id && row.profile_id !== actorId) {
          recipients.push({ id: row.profile_id, role: "admin" });
        }
      }
    } else {
      // Students cannot authorise timetable changes, so there is nobody to tell.
      return;
    }

    /* Students are resolved even when the teacher/admin list came back empty:
       an admin editing a session they teach themselves has no teacher recipient
       but the batch still has to hear about it. */
    const studentIds = await NotificationsService.collectBatchStudents(sessions, actorId);

    if (recipients.length === 0 && studentIds.length === 0) return;

    const message = buildTimetableNotificationMessage(
      action,
      { role: actorRole, name: actorName },
      sessions
    );
    const sessionIds = sessions.map((session) => session.id);

    const results = await Promise.allSettled([
      ...recipients.map((recipient) =>
        NotificationsService.create({
          data: {
            message,
            link: timetableNotificationLink(recipient.role, sessionIds),
          },
          senderIds: [actorId],
          recipientId: recipient.id,
          type: TIMETABLE_TYPE[action],
        })
      ),
      ...studentIds.map((studentId) =>
        NotificationsService.create({
          data: {
            message,
            link: timetableNotificationLink("student", sessionIds),
          },
          senderIds: [actorId],
          recipientId: studentId,
          type: TIMETABLE_TYPE[action],
        })
      ),
    ]);

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[notifications] create failed:", result.reason);
      }
    }
  }

  /**
   * Students in the affected batch(es) hear about a timetable change too â€” a
   * swap moves their lesson whether or not they were told by a teacher.
   *
   * De-duplicated across sessions, because a swap spanning two batches in the
   * same call can share a student, and one notification per event is the point.
   *
   * Returns an empty list on failure so a lookup problem cannot stop the
   * teacher and admin notifications that were already resolved.
   */
  private static async collectBatchStudents(
    sessions: TimetableSessionRef[],
    actorId: string
  ): Promise<string[]> {
    try {
      const batchIds = [...new Set(sessions.map((s) => s.batchId).filter((id): id is string => Boolean(id)))];

      if (batchIds.length === 0) return [];

      const supabase = await createClient();

      const { data, error } = await supabase
        .from("batch_assignments")
        .select("student_id")
        .in("batch_id", batchIds);

      if (error) {
        console.error("[notifications] batch_assignments lookup failed:", error.message);
        return [];
      }

      return [
        ...new Set(
          ((data ?? []) as Array<{ student_id: string | null }>)
            .map((row) => row.student_id)
            .filter((id): id is string => Boolean(id) && id !== actorId)
        ),
      ];
    } catch (error) {
      console.error("[notifications] batch students failed:", error);
      return [];
    }
  }

  /**
   * Tells the admins that a teacher opened a session. Check-in only registers
   * that the session is happening â€” an admin still has to mark who turned up â€”
   * so this is the prompt to go and do it.
   *
   * Never throws: the attendance rows are already written by this point.
   */
  static async notifyTeacherCheckIn({
    teacherId,
    teacherName,
    attendanceId,
    session,
  }: {
    teacherId: string;
    teacherName: string;
    attendanceId: string;
    session: CheckInSession;
  }) {
    const supabase = await createClient();

    const { data: adminIds, error } = await supabase.rpc("get_admin_ids");

    if (error) {
      console.error("[notifications] get_admin_ids failed:", error.message);
      return;
    }

    const recipients = ((adminIds ?? []) as Array<{ profile_id: string }>)
      .map((row) => row.profile_id)
      .filter((id) => id && id !== teacherId);

    if (recipients.length === 0) return;

    const data = {
      message: buildTeacherCheckInMessage(teacherName, session),
      link: `/admin/dashboard/attendances?id=${encodeURIComponent(attendanceId)}`,
    };

    const results = await Promise.allSettled(
      recipients.map((recipientId) =>
        NotificationsService.create({
          data,
          senderIds: [teacherId],
          recipientId,
          type: "attendance_checked_in",
        })
      )
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[notifications] create failed:", result.reason);
      }
    }
  }

  /**
   * Tells the admins a student is waiting on them. A new enrolment is created
   * as `unassigned`, so nothing else happens until someone approves it â€” this
   * notification is that prompt, and the link lands on the queue filtered to
   * this one student.
   *
   * Never throws: the enrolment rows are already written by this point.
   */
  static async notifyAdminsOfEnrollmentRequest({
    studentId,
    studentName,
    moduleCodes,
    level,
  }: {
    studentId: string;
    studentName: string;
    moduleCodes: string[];
    level?: string | null;
  }) {
    const supabase = await createClient();

    const { data: adminIds, error } = await supabase.rpc("get_admin_ids");

    if (error) {
      console.error("[notifications] get_admin_ids failed:", error.message);
      return;
    }

    const recipients = ((adminIds ?? []) as Array<{ profile_id: string }>)
      .map((row) => row.profile_id)
      .filter((id) => id && id !== studentId);

    if (recipients.length === 0) return;

    const data = {
      message: buildEnrollmentRequestMessage(studentName, moduleCodes, level),
      /* The enrollments list already matches this param against either the
         student id or an enrolment id, so a student id resolves to exactly
         this student. */
      link: `/admin/dashboard/enrollments?id=${encodeURIComponent(studentId)}`,
    };

    const results = await Promise.allSettled(
      recipients.map((recipientId) =>
        NotificationsService.create({
          data,
          senderIds: [studentId],
          recipientId,
          type: "enrollment_requested",
        })
      )
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[notifications] create failed:", result.reason);
      }
    }
  }

  /**
   * Tells a student they have been placed in a batch, which is the moment their
   * timetable, assignments and attendance start to mean something.
   *
   * Resolves the actor itself rather than taking an id: the sender has to be
   * the signed-in user for `create_notification` to accept it, and the message
   * says "Admin", so this only fires when an admin is the one assigning.
   *
   * Never throws: the assignment row is already written by this point.
   */
  /**
   * Tells a student they have been placed in a batch, which is the moment their
   * timetable, assignments and attendance start to mean something.
   *
   * Resolves the actor itself rather than taking an id: the sender has to be
   * the signed-in user for `create_notification` to accept it, and the message
   * says "Admin", so this only fires when an admin is the one assigning.
   *
   * Never throws: the assignment row is already written by this point.
   */
  static async notifyStudentOfBatchAssignment({
    studentId,
    batchId,
    batchName,
  }: {
    studentId: string;
    batchId: string;
    batchName: string;
  }) {
    const supabase = await createClient();

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) return;

    const { data: actor, error: actorError } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    /* Only an admin can place a student in a batch, and the message names
       "Admin" â€” so anything else must not be announced as one. */
    if (actorError || !actor || actor.role !== "admin") return;

    if (studentId === actor.id) return;

    await NotificationsService.create({
      data: {
        message: buildBatchAssignedMessage(batchName),
        link: `/student/dashboard/batches/${encodeURIComponent(batchId)}`,
      },
      senderIds: [actor.id],
      recipientId: studentId,
      type: "batch_assigned",
    });
  }

  /**
   * A student turning work in is news for the teacher who set it and for the
   * admins keeping an eye on it.
   *
   * Degrades rather than failing: if `teacherId` could not be resolved (RLS may
   * hide the assignment row from the student submitting it) the admins are
   * still told, and the message simply drops the module.
   *
   * Never throws: the submission row is already written by this point.
   */
  static async notifyTeacherAndAdminsOfSubmission({
    studentId,
    studentName,
    assignmentId,
    submissionId,
    teacherId,
    moduleCode,
    batchName,
  }: {
    studentId: string;
    studentName: string;
    assignmentId: string;
    submissionId?: string | null;
    teacherId?: string | null;
    moduleCode?: string | null;
    batchName?: string | null;
  }) {
    const supabase = await createClient();

    const recipients: Recipient[] = [];

    if (teacherId && teacherId !== studentId) {
      recipients.push({ id: teacherId, role: "teacher" });
    }

    const { data: adminIds, error } = await supabase.rpc("get_admin_ids");

    if (error) {
      console.error("[notifications] get_admin_ids failed:", error.message);
    } else {
      for (const row of (adminIds ?? []) as Array<{ profile_id: string }>) {
        if (row.profile_id && row.profile_id !== studentId) {
          recipients.push({ id: row.profile_id, role: "admin" });
        }
      }
    }

    if (recipients.length === 0) return;

    const message = buildAssignmentSubmittedMessage(studentName, moduleCode, batchName);

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        NotificationsService.create({
          data: {
            message,
            link: assignmentNotificationLink(recipient.role, assignmentId, submissionId),
          },
          senderIds: [studentId],
          recipientId: recipient.id,
          type: "assignment_submitted",
        })
      )
    );

    for (const result of results) {
      if (result.status === "rejected") {
        console.error("[notifications] create failed:", result.reason);
      }
    }
  }
}