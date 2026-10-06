import type { StudentAssignment } from "@/types/student-assignment.type";

export type DeadlineState = "overdue" | "today" | "soon" | "scheduled" | "none";

export type Deadline = {
  state: DeadlineState;
  /** Spoken as a developer reads time: "3d late", "in 4h". */
  countdown: string;
  /** "06 Oct, 23:59" */
  stamp: string;
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** One urgency rail for the whole list, so the eye can scan down the left edge
 *  and see how much is on fire without reading a single date. */
export const DEADLINE_STATE = {
  overdue: { rail: "border-l-error", label: "Overdue", text: "text-error" },
  today: { rail: "border-l-primary", label: "Due today", text: "text-primary" },
  soon: { rail: "border-l-tertiary", label: "Due soon", text: "text-tertiary" },
  scheduled: { rail: "border-l-outline", label: "Scheduled", text: "text-on-surface-variant" },
  none: { rail: "border-l-outline", label: "No deadline", text: "text-on-surface-variant" },
} as const;

function magnitudeLabel(days: number, hours: number, minutes: number) {
  if (days > 0) return days <= 3 && hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  if (hours > 0) return `${hours}h`;
  return `${minutes}m`;
}

export function describeDeadline(deadlineAt: string | null, now: Date): Deadline {
  if (!deadlineAt) return { state: "none", countdown: "No deadline set", stamp: "" };

  const due = new Date(deadlineAt);
  if (Number.isNaN(due.getTime())) {
    return { state: "none", countdown: "No deadline set", stamp: "" };
  }

  const remaining = due.getTime() - now.getTime();
  const magnitude = Math.abs(remaining);
  const days = Math.floor(magnitude / DAY);
  const hours = Math.floor((magnitude % DAY) / HOUR);
  const minutes = Math.floor((magnitude % HOUR) / MINUTE);

  const stamp = due.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  if (remaining < -MINUTE) {
    return { state: "overdue", countdown: `${magnitudeLabel(days, hours, minutes)} late`, stamp };
  }

  if (remaining <= MINUTE) {
    return { state: "today", countdown: "due now", stamp };
  }

  const state: DeadlineState = days === 0 ? "today" : days <= 3 ? "soon" : "scheduled";
  return { state, countdown: `in ${magnitudeLabel(days, hours, minutes)}`, stamp };
}

/** Undated work sorts last rather than first, where it would outrank real
 *  deadlines by accident. */
function deadlineTime(assignment: StudentAssignment) {
  if (!assignment.deadline_at) return Number.POSITIVE_INFINITY;
  const time = new Date(assignment.deadline_at).getTime();
  return Number.isNaN(time) ? Number.POSITIVE_INFINITY : time;
}

export function sortByUrgency(assignments: StudentAssignment[]) {
  return [...assignments].sort((a, b) => deadlineTime(a) - deadlineTime(b));
}

const WORD_EXTENSIONS = [".doc", ".docx"];
const WORD_MIME_TYPES = [
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

/** Both extensions and MIME types are listed because Safari and Windows
 *  disagree about which of the two the OS reports for a .docx. */
export const WORD_ACCEPT = [...WORD_EXTENSIONS, ...WORD_MIME_TYPES].join(",");

export const WORD_REJECTION = "Word documents only — a .doc or .docx file.";

/** `accept` is only a filter hint; a user can still pick "All files", so the
 *  choice has to be checked rather than trusted. Extension is checked too,
 *  since an empty MIME type is common from some browsers. */
export function isWordFile(file: File) {
  const name = file.name.toLowerCase();
  return (
    WORD_EXTENSIONS.some((extension) => name.endsWith(extension)) ||
    WORD_MIME_TYPES.includes(file.type)
  );
}

/** Browsers sometimes hand over a .docx with an empty type, which would upload
 *  as application/octet-stream and download as an unopenable file. */
export function wordContentType(file: File) {
  if (file.type) return file.type;
  return file.name.toLowerCase().endsWith(".doc")
    ? "application/msword"
    : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
}

export const ASSIGNMENT_BUCKET = "assignments";

/** BatchId_ModuleId/StudentId/fileName — one folder per assignment, one
 *  subfolder per student, so nobody can overwrite anybody else's work. */
export function buildSubmissionPath(
  batchId: string,
  moduleId: string,
  studentId: string,
  fileName: string
) {
  return `${batchId}_${moduleId}/${studentId}/${fileName}`;
}

const PUBLIC_PREFIX = "/storage/v1/object/public/";

/** `file_path` holds a public URL, but Storage operations need the bare key back.
 *  Returns null for anything that is not an `assignments` bucket public URL —
 *  rows written before this changed store a relative key, and those must still
 *  be deletable, so the caller skips the bucket step rather than failing. */
export function storageKeyFromPublicUrl(url: string | null | undefined) {
  if (!url) return null;

  const marker = `${PUBLIC_PREFIX}${ASSIGNMENT_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null;

  return url.slice(index + marker.length);
}