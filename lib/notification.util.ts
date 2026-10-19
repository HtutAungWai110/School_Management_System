import type { NotificationData } from "@/types/notification.type";
import { DAY_OF_WEEK_LABELS } from "@/types/timetable.type";

/** Only what a profile edit can actually change. `id` is excluded. */
const FIELDS = [
  "full_name",
  "email",
  "phone",
  "address",
  "date_of_birth",
  "role",
  "avatar_url",
] as const;

const FIELD_LABELS: Record<string, string> = {
  full_name: "name",
  email: "email",
  phone: "phone",
  address: "address",
  date_of_birth: "date of birth",
  role: "role",
  avatar_url: "avatar",
};

const MAX_VALUE_LENGTH = 40;

/** postgres returns absent and empty columns differently depending on the
 *  driver path (null vs undefined vs ""), so compare on a normalised string
 *  or every untouched column reads as changed. */
function normalise(value: unknown): string {
  return value === null || value === undefined ? "" : String(value);
}

function formatValue(value: unknown): string {
  const text = normalise(value);
  if (text === "") return "empty";
  return text.length > MAX_VALUE_LENGTH ? `${text.slice(0, MAX_VALUE_LENGTH)}…` : text;
}

export type ProfileSnapshot = {
  id: string;
  role: string;
} & Partial<Record<(typeof FIELDS)[number], unknown>>;

/** "phone: 077… → 080…" style fragments, in a fixed order so the message is
 *  stable between runs rather than depending on object key order. */
export function describeProfileChanges(before: ProfileSnapshot, after: ProfileSnapshot): string[] {
  return FIELDS.filter((field) => normalise(before[field]) !== normalise(after[field])).map(
    (field) => `${FIELD_LABELS[field]}: ${formatValue(before[field])} → ${formatValue(after[field])}`,
  );
}

/** The admin-side page for each role, carrying the `?id=` lookup that
 *  /admin/dashboard/students and /admin/dashboard/teachers now accept. Admins
 *  have no equivalent list page, so they produce no link. */
function profileLink(role: string, id: string): string | null {
  if (role === "student") return `/admin/dashboard/students?id=${id}`;
  if (role === "teacher") return `/admin/dashboard/teachers?id=${id}`;
  return null;
}

/**
 * Builds the `{message, link}` payload for a profile edit, or null when there
 * is nothing worth telling anyone about — no fields actually changed, or the
 * edited profile has no admin-side page to link to.
 */
export function buildProfileUpdatedNotification(
  before: ProfileSnapshot,
  after: ProfileSnapshot,
): NotificationData | null {
  const changes = describeProfileChanges(before, after);
  if (changes.length === 0) return null;

  const link = profileLink(normalise(after.role), after.id);
  if (!link) return null;

  /* Admins are referred to by role, never by name. */
  const subject =
    normalise(after.role) === "admin" ? "Admin" : normalise(after.full_name) || "Someone";
  const summary = changes.join("; ");

  return {
    message: `${subject} updated their info: ${summary}`,
    link,
  };
}

/* ------------------------------------------------------------------ */
/* Timetable changes                                                    */
/* ------------------------------------------------------------------ */

export type TimetableAction = "scheduled" | "updated" | "swapped";

export type TimetableSessionRef = {
  id: string;
  teacherId: string | null;
  /** Used to find the batch's students, who also need to hear about this. */
  batchId?: string | null;
  moduleCode?: string | null;
  batchName?: string | null;
};

/** Bare noun phrase: "NCC2015 for Batch A". Reads correctly after a verb. */
function sessionPhrase(session: TimetableSessionRef): string {
  // Not named `module`: Next.js reserves that identifier.
  const code = session.moduleCode?.trim() || "a session";
  const batch = session.batchName?.trim();
  return batch ? `${code} for ${batch}` : code;
}

/** Full noun phrase: "the NCC2015 session for Batch A". Needed where the
 *  sentence has an article, so the batch is not stranded inside it — that is
 *  what produced "updated the NCC2015 for Batch A session". */
function sessionNoun(session: TimetableSessionRef): string {
  const code = session.moduleCode?.trim() || "a session";
  const batch = session.batchName?.trim();
  return batch ? `the ${code} session for ${batch}` : `the ${code} session`;
}

/**
 * One message per recipient covering every session the action touched. A swap
 * moves two sessions at once and should read as one event, not two.
 *
 * An admin is referred to by role rather than name: a teacher is told the
 * schedule changed, not which admin changed it. Teachers are named in full,
 * since the whole point of the notification is that their own session moved.
 */
export function buildTimetableNotificationMessage(
  action: TimetableAction,
  actor: { role: string; name: string },
  sessions: TimetableSessionRef[]
): string {
  /* The subject is the bare name, with admins reduced to their role: "Ana
     scheduled ...", "Admin scheduled ...". No "user" prefix anywhere. */
  const who = actor.role === "admin" ? "Admin" : actor.name?.trim() || "Someone";

  if (action === "scheduled") {
    return `${who} scheduled ${sessionPhrase(sessions[0])}`;
  }

  if (action === "updated") {
    return `${who} updated ${sessionNoun(sessions[0])}`;
  }

  if (sessions.length < 2) {
    return `${who} swapped ${sessionPhrase(sessions[0])}`;
  }

  return `${who} swapped ${sessionPhrase(sessions[0])} with ${sessionPhrase(sessions[1])}`;
}

/**
 * Recipient-aware destination. A swap touches two sessions, so the id is
 * repeated — `?id=a&id=b` — rather than only the first, which would send a
 * reader to half of what happened.
 *
 * All three timetables (admin, teacher and student) understand the `?id=`
 * lookup. Each recipient stays on their own side of the proxy, which would
 * otherwise bounce them to their dashboard on role mismatch.
 */
export function timetableNotificationLink(recipientRole: string, sessionIds: string[]): string {
  const query = sessionIds
    .filter(Boolean)
    .map((id) => `id=${encodeURIComponent(id)}`)
    .join("&");

  const base =
    recipientRole === "student"
      ? "/student/dashboard/timetable"
      : recipientRole === "teacher"
        ? "/teacher/dashboard/timetable"
        : "/admin/dashboard/timetable";

  return query ? `${base}?${query}` : base;
}

/* ------------------------------------------------------------------ */
/* Teacher check-in                                                     */
/* ------------------------------------------------------------------ */

export type CheckInSession = {
  moduleCode?: string | null;
  batchName?: string | null;
  dayOfWeek?: number | null;
  startTime?: string | null;
  endTime?: string | null;
};

/** "NCC2015 for Batch A, Monday 09:00–10:00" — enough for an admin to recognise
 *  the session at a glance without opening it. */
function describeCheckInSession(session: CheckInSession): string {
  const code = session.moduleCode?.trim() || "a session";
  const batch = session.batchName?.trim();
  const what = batch ? `${code} for ${batch}` : code;

  const day =
    session.dayOfWeek !== null && session.dayOfWeek !== undefined
      ? DAY_OF_WEEK_LABELS[session.dayOfWeek]
      : undefined;

  const start = session.startTime?.slice(0, 5);
  const end = session.endTime?.slice(0, 5);
  const time = start && end ? `${start}–${end}` : start ?? undefined;
  const when = [day, time].filter(Boolean).join(" ");

  return when ? `${what}, ${when}` : what;
}

export function buildTeacherCheckInMessage(teacherName: string, session: CheckInSession): string {
  return `Teacher ${teacherName.trim() || "A teacher"} checked into ${describeCheckInSession(session)}`;
}

/* ------------------------------------------------------------------ */
/* Enrollment requests                                                  */
/* ------------------------------------------------------------------ */

function joinList(values: string[]): string {
  if (values.length === 0) return "";
  if (values.length === 1) return values[0];
  /* Oxford-comma only from three up: "A and B" reads better than "A, and B". */
  if (values.length === 2) return `${values[0]} and ${values[1]}`;
  return `${values.slice(0, -1).join(", ")}, and ${values[values.length - 1]}`;
}

/**
 * "Ana requested enrollment in NCC2015 and NCC2016 for LEVEL 4 Diploma in
 * Computing" — the level is what an admin is actually approving, so it earns
 * its place even though the module codes are what the student picked.
 */
export function buildEnrollmentRequestMessage(
  studentName: string,
  moduleCodes: string[],
  level?: string | null
): string {
  const subject = studentName.trim() || "A student";
  const codes = joinList(moduleCodes);

  const what = codes ? `enrollment in ${codes}` : "an enrollment";
  const where = level?.trim() ? ` for ${level.trim()}` : "";

  return `${subject} requested ${what}${where}`;
}

/* ------------------------------------------------------------------ */
/* Batch assignment                                                     */
/* ------------------------------------------------------------------ */

/**
 * "Admin assigned you to Level 4, Batch 3" — second person, so no name
 * prefix, and the actor stays "Admin" for the same reason as everywhere else.
 */
export function buildBatchAssignedMessage(batchName: string): string {
  return `Admin assigned you to ${batchName.trim() || "a batch"}`;
}

/* ------------------------------------------------------------------ */
/* Assignment submissions                                               */
/* ------------------------------------------------------------------ */

/**
 * "Ana Kim turned in an assignment for NCC2004 in Level 4, Batch 2" — module
 * and batch are optional because a notification still has to read sensibly if
 * RLS hides the assignment row from the student submitting it.
 */
export function buildAssignmentSubmittedMessage(
  studentName: string,
  moduleCode?: string | null,
  batchName?: string | null
): string {
  const subject = studentName.trim() || "A student";
  const code = moduleCode?.trim();
  const batch = batchName?.trim();

  const what = code ? `an assignment for ${code}` : "an assignment";
  const where = batch ? ` in ${batch}` : "";

  return `${subject} turned in ${what}${where}`;
}

/** Both ids are carried so the reader lands on the exact submission rather than
 *  the whole list: `id` is the assignment, `submissionId` the student's row
 *  inside it. */
export function assignmentNotificationLink(
  recipientRole: string,
  assignmentId: string,
  submissionId?: string | null
): string {
  const base =
    recipientRole === "teacher"
      ? "/teacher/dashboard/assignments"
      : "/admin/dashboard/assignments";

  const query = [
    assignmentId ? `id=${encodeURIComponent(assignmentId)}` : null,
    submissionId ? `submissionId=${encodeURIComponent(submissionId)}` : null,
  ].filter(Boolean);

  return query.length > 0 ? `${base}?${query.join("&")}` : base;
}

/* ------------------------------------------------------------------ */
/* Announcements                                                        */
/* ------------------------------------------------------------------ */

/**
 * "Admin posted an announcement in Level 4, Batch 2: Sports day moved to
 * Friday" — the excerpt saves opening the noticeboard for a one-line post.
 *
 * The body is multi-line and a newline would break the single-line toast, so
 * every run of whitespace collapses to one space first.
 */
export function buildAnnouncementPostedMessage(
  batchName: string,
  content?: string | null
): string {
  const batch = batchName.trim() || "your batch";
  const excerpt = content?.replace(/\s+/g, " ").trim() ?? "";
  const preview = excerpt.length > 80 ? `${excerpt.slice(0, 80)}…` : excerpt;

  return preview
    ? `Admin posted an announcement in ${batch}: ${preview}`
    : `Admin posted an announcement in ${batch}`;
}

/**
 * Destination for a notice. Both role-side noticeboards read
 * `?announcement_id=`, so the reader lands on the exact post rather than the
 * top of the feed. The path segment keeps each role on its own side of the
 * proxy, which would otherwise bounce a role mismatch.
 */
export function announcementNotificationLink(
  recipientRole: string,
  batchId: string,
  announcementId: string
): string {
  const base =
    recipientRole === "teacher"
      ? `/teacher/dashboard/batches/${encodeURIComponent(batchId)}/announcements`
      : `/student/dashboard/batches/${encodeURIComponent(batchId)}/announcements`;

  return `${base}?announcement_id=${encodeURIComponent(announcementId)}`;
}