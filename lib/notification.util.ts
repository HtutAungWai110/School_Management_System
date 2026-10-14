import type { NotificationData } from "@/types/notification.type";

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

  const fullName = normalise(after.full_name) || "A user";
  const summary = changes.join("; ");

  return {
    message: `user ${fullName} updated their info: ${summary}`,
    link,
  };
}