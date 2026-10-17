import type { NotificationData, NotificationRow } from "@/types/notification.type";

/** localStorage is a few MB at best, and this is a convenience for read
 *  history — the unread rows always come from the database. */
export const MAX_STORED = 200;

/** Read notifications older than this are dropped on the next write, so the
 *  cache cannot grow without bound across a long-lived browser profile. */
export const MAX_STORED_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Namespaced per user: localStorage is per-origin and shared by everyone who
 *  uses the browser, so an un-namespaced key would show one user's history
 *  inside another user's list. */
function storageKey(userId: string) {
  return `notifications:read:${userId}`;
}

/** Newest first, with `id` breaking ties so the order is total. */
export function byCreatedDesc(a: { created_at: string; id: string }, b: { created_at: string; id: string }) {
  const diff = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  if (diff !== 0 && !Number.isNaN(diff)) return diff;
  return b.id.localeCompare(a.id);
}

export function toStored(row: NotificationRow): StoredRow | null {
  const data = row.data as Partial<NotificationData> | null;
  if (!data || typeof data.message !== "string") return null;

  return {
    id: row.id,
    message: data.message,
    link: typeof data.link === "string" ? data.link : "",
    created_at: row.created_at,
  };
}

export type StoredRow = {
  id: string;
  message: string;
  link: string;
  created_at: string;
};

function isStoredRow(value: unknown): value is StoredRow {
  const row = value as StoredRow | null;
  return Boolean(
    row &&
      typeof row.id === "string" &&
      typeof row.message === "string" &&
      typeof row.created_at === "string" &&
      !Number.isNaN(new Date(row.created_at).getTime())
  );
}

export function pruneStored(rows: StoredRow[]): StoredRow[] {
  const cutoff = Date.now() - MAX_STORED_AGE_MS;

  return rows
    .filter(isStoredRow)
    .filter((row) => new Date(row.created_at).getTime() >= cutoff)
    .sort(byCreatedDesc)
    .slice(0, MAX_STORED);
}

/** Stable empty reference for the SSR snapshot — `useSyncExternalStore`
 *  compares snapshots by identity, so a fresh `[]` each call would loop. */
const EMPTY: StoredRow[] = [];

/** Module-level mirror of what is in storage. `useSyncExternalStore` requires
 *  `getSnapshot` to be identity-stable, so the parsed rows are cached here and
 *  only re-read when the user or storage changes. */
let cache: { userId: string; rows: StoredRow[] } | null = null;

const listeners = new Set<() => void>();

function invalidate() {
  cache = null;
  listeners.forEach((listener) => listener());
}

/** Same-tab writes and cross-tab `storage` events both funnel through here. */
export function subscribeStored(listener: () => void) {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => listeners.delete(listener);
  }

  const onStorage = () => invalidate();
  window.addEventListener("storage", onStorage);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getStoredSnapshot(userId: string): StoredRow[] {
  if (typeof window === "undefined" || !userId) return EMPTY;

  if (!cache || cache.userId !== userId) {
    cache = { userId, rows: readStored(userId) };
  }

  return cache.rows;
}

export function getEmptySnapshot(): StoredRow[] {
  return EMPTY;
}

export function readStored(userId: string): StoredRow[] {
  // Guarded because this is imported by client components that render during
  // SSR, where `localStorage` does not exist.
  if (typeof window === "undefined" || !userId) return [];

  try {
    const raw = window.localStorage.getItem(storageKey(userId));
    if (!raw) return [];

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return pruneStored(parsed as StoredRow[]);
  } catch {
    // Corrupt value or storage disabled. An empty cache is recoverable — the
    // next read repopulates it.
    return [];
  }
}

export function persistStored(userId: string, rows: StoredRow[]) {
  if (typeof window === "undefined" || !userId) return;

  try {
    window.localStorage.setItem(storageKey(userId), JSON.stringify(rows));
    /* Seed the cache from the bytes actually written, rather than re-parsing,
       so a failed write cannot leave the snapshot disagreeing with storage. */
    cache = { userId, rows };
    listeners.forEach((listener) => listener());
  } catch {
    // Quota exceeded or private mode. Losing the cache is preferable to
    // breaking the page.
  }
}