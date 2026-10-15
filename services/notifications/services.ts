import { createClient } from "@/lib/supabase/server.client";
import {
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
   * Reads the viewer's unread notifications, newest first.
   *
   * Only unread rows: once a notification has been seen it is cached client
   * side and no longer needs to cross the wire on every page load.
   *
   * Ownership is not filtered here on purpose — the SELECT policy
   * (`auth.uid() = recipient_id`) already scopes every row, so a redundant
   * `.eq("recipient_id", ...)` could only mask a policy regression.
   */
  static async list(limit: number) {
    const supabase = await createClient();

    const { data, error, count } = await supabase
      .from("notifications")
      .select("*", { count: "exact" })
      .eq("is_read", false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(error.message);
    }

    /* Every row here is unread, so `count` is the unread total — no second
       count query is needed. */
    return {
      notifications: (data as NotificationRow[] | null) ?? [],
      totalCount: count ?? 0,
    };
  }

  /**
   * Marks the given notifications read. Batched because an IntersectionObserver
   * can report several rows entering the viewport in a single callback, and one
   * request per row would be wasteful.
   *
   * RLS restricts the update to the caller's own rows, so ids belonging to
   * someone else simply match nothing rather than being written.
   */
  static async markRead(ids: string[]) {
    if (ids.length === 0) return { success: true };

    const supabase = await createClient();

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .in("id", ids);

    if (error) {
      throw new Error(error.message);
    }

    return { success: true };
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

    if (recipients.length === 0) return;

    const message = buildTimetableNotificationMessage(
      action,
      { role: actorRole, name: actorName },
      sessions
    );

    const results = await Promise.allSettled(
      recipients.map((recipient) =>
        NotificationsService.create({
          data: {
            message,
            link: timetableNotificationLink(
              recipient.role,
              sessions.map((session) => session.id)
            ),
          },
          senderIds: [actorId],
          recipientId: recipient.id,
          type: TIMETABLE_TYPE[action],
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
   * Tells the admins that a teacher opened a session. Check-in only registers
   * that the session is happening — an admin still has to mark who turned up —
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
}