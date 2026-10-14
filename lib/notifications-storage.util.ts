import type { NotificationData, NotificationRow, StoredNotification } from "@/types/notification.type";

/** localStorage is a few MB at best, and this cache is a convenience rather
 *  than a source of truth — the database still holds every row. */
export const MAX_STORED = 200;

/** Read notifications older than this are dropped on the next write, so the
 *  cache cannot grow without bound across a long-lived browser profile. */
export const MAX_STORED_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Namespaced per user: localStorage is per-origin and shared by everyone who
 *  uses the browser, so an un-namespaced key would show one user's read
 *  notifications inside another user's list. */
function storageKey(userId: string) {
  return `notifications:read:${userId}`;
}

/** Newest first, with `id` breaking ties so the order is total — two
 *  notifications created in the same millisecond must not swap places between
 *  renders. */
export function byCreatedDesc(a: StoredNotification, b: StoredNotification) {
  const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  if (diff !== 0 && !Number.isNaN(diff)) return diff;
  return b.id.localeCompare(a.id);
}

export function isStoredNotification(value: unknown): value is StoredNotification {
  const row = value as StoredNotification | null;
  return Boolean(
    row &&
      typeof row.id === "string" &&
      typeof row.message === "string" &&
      typeof row.created_at === "string" &&
      !Number.isNaN(new Date(row.created_at).getTime())
  );
}

/** Drops malformed and expired entries, sorts newest-first and caps the
 *  length. Exported so the caller can persist exactly what it will render. */
export function pruneStored(rows: StoredNotification[]): StoredNotification[] {
  const cutoff = Date.now() - MAX_STORED_AGE_MS;

  return rows
    .filter(isStoredNotification)
    .filter((row) => new Date(row.created_at).getTime() >= cutoff)
    .sort(byCreatedDesc)
    .slice(0, MAX_STORED);
}

export function readStored(userId: string): StoredNotification[] {
  // Guarded because this module is imported by client components that render
  // during SSR, where `localStorage` does not exist.
  if (typeof window === "undefined" || !userId) return [];

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return pruneStored(parsed as StoredNotification[]);
  } catch {
    // Corrupt value or storage disabled. An empty cache is recoverable — the
    // next view repopulates it.
    return [];
  }
}

/** Stable empty reference for the SSR snapshot — `useSyncExternalStore`
 *  compares snapshots by identity, so a fresh `[]` each call would loop. */
const EMPTY: StoredNotification[] = [];

/** Module-level mirror of what is in localStorage. `useSyncExternalStore`
 *  requires `getSnapshot` to return an identity-stable value, so the parsed
 *  rows are cached here and only re-read when the user or storage changes. */
let cache: { userId: string; rows: StoredNotification[] } | null = null;

const listeners = new Set<() => void>();

function invalidate() {
  cache = null;
  listeners.forEach((listener) => listener());
}

/** Same-tab writes and cross-tab `storage` events both funnel through here. */
export function subscribeStored(listener: () => void) {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => listeners.delete(listener)
  }

  const onStorage = () => invalidate()
  window.addEventListener("storage", onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

export function getStoredSnapshot(userId: string): StoredNotification[] {
  if (typeof window === "undefined" || !userId) return EMPTY

  if (!cache || cache.userId !== userId) {
    cache = { userId, rows: readStored(userId) }
  }

  return cache.rows
}

export function getEmptySnapshot(): StoredNotification[] {
  return EMPTY
}

export function persistStored(userId: string, rows: StoredNotification[]) {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(rows))
    // Seed the cache from what was actually written, rather than re-parsing,
    // so a failed write cannot leave the snapshot disagreeing with storage.
    cache = { userId, rows }
    listeners.forEach((listener) => listener())
  } catch {
    // Quota exceeded or private mode. Losing the cache is preferable to
    // breaking the page.
  }
}

/** Projects a full row down to the trimmed, display-only shape. */
export function toStored(row: NotificationRow): StoredNotification | null {
  const data = row.data as Partial<NotificationData> | null;
  if (!data || typeof data.message !== "string") return null;

  return {
    id: row.id,
    message: data.message,
    link: typeof data.link === "string" ? data.link : "",
    created_at: row.created_at,
  };
}