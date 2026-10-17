"use client"

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react"
import type { RealtimeChannel } from "@supabase/supabase-js"

import { createClient } from "@/lib/supabase/browser.client"
import { useProfileStore } from "@/components/profile/profile.state"
import {
  byCreatedDesc,
  getEmptySnapshot,
  getStoredSnapshot,
  persistStored,
  pruneStored,
  subscribeStored,
  toStored,
  type StoredRow,
} from "@/lib/notifications-storage.util"
import type { NotificationData, NotificationRow, NotificationToast } from "@/types/notification.type"

/** Unread rows are the live set, so the read is capped. The *count* is not:
 *  it comes from an exact head query, so a large unread backlog still reports
 *  the true number rather than the size of this window. */
const MAX_UNREAD_ROWS = 100

export type NotificationViewItem = {
  id: string;
  message: string;
  link: string;
  created_at: string;
  isRead: boolean;
};

export function toToast(row: NotificationRow): NotificationToast | null {
  const data = row.data as Partial<NotificationData> | null;
  if (!data || typeof data.message !== "string") return null;

  return {
    id: row.id,
    message: data.message,
    link: typeof data.link === "string" ? data.link : "",
    created_at: row.created_at,
  };
}

/* ------------------------------------------------------------------ *
 * One channel, many consumers
 *
 * `createBrowserClient` from @supabase/ssr memoises its instance, so every
 * `createClient()` in the app hands back the same client. And `channel(topic)`
 * on a given client returns the *existing* channel for that topic rather than
 * a new one. So two components each running
 *
 *     client.channel(topic).on("postgres_changes", …).subscribe()
 *
 * makes the second `.on()` land on a channel that has already subscribed, and
 * Realtime throws: "cannot add postgres_changes callbacks … after subscribe()".
 *
 * The channel is therefore owned here, at module scope, and every consumer is
 * just a listener on it.
 * ------------------------------------------------------------------ */

type InsertListener = (row: NotificationRow) => void;

const listeners = new Set<InsertListener>();
let activeChannel: RealtimeChannel | null = null;
let activeUserId: string | null = null;

/** Bumped for every channel built.
 *
 *  The topic has to be unique per channel, not just per user. `removeChannel`
 *  is fire-and-forget, so rebuilding under the *same* topic name can hand back
 *  the channel that is still mid-unsubscribe — and attaching to it throws
 *  "cannot add postgres_changes callbacks after subscribe()" all over again.
 *  A generation suffix makes a rebuild always start from a clean topic. */
let generation = 0;

function listenForInserts(userId: string, listener: InsertListener) {
  const client = createClient();
  listeners.add(listener);

  // Rebuild when there is no channel yet, or the signed-in user changed and
  // the filter on the existing one is now wrong.
  if (!activeChannel || activeUserId !== userId) {
    if (activeChannel) client.removeChannel(activeChannel);

    const next = client
      .channel(`notifications:${userId}#${++generation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `recipient_id=eq.${userId}`,
        },
        (payload) => {
          const row = payload.new as NotificationRow;
          listeners.forEach((fn) => fn(row));
        }
      )
      .subscribe();

    activeChannel = next;
    activeUserId = userId;
  }

  return () => {
    listeners.delete(listener);

    // Nothing left watching: drop the socket rather than leaving a subscribed
    // channel open with no consumer.
    if (listeners.size === 0 && activeChannel) {
      client.removeChannel(activeChannel);
      activeChannel = null;
      activeUserId = null;
    }
  };
}

function toView(row: StoredRow, isRead: boolean): NotificationViewItem {
  return { ...row, isRead };
}

/**
 * Unread notifications come from Supabase and arrive live over Realtime; read
 * ones are kept in localStorage. Both are rendered in one list ordered by
 * created_at.
 *
 * The split is the point: read history never needs to cross the wire again, and
 * the unread set stays exact because it is queried directly rather than
 * inferred from a window of recent rows.
 *
 * Writes still go through the server for creation — `notifications` has no
 * INSERT policy, so `create_notification` remains the only way a row is made.
 * Marking read is a direct UPDATE, which the policy allows (and which needs the
 * SELECT policy to exist, and it does).
 */
export function useNotification() {
  const userId = useProfileStore((state) => state.profile?.id);
  const hydrated = useProfileStore((state) => state.hydrated);

  /* The live unread set. */
  const [unread, setUnread] = useState<NotificationRow[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [incoming, setIncoming] = useState<NotificationToast[]>([]);
  const [error, setError] = useState<string | null>(null);

  /* Read history. Read through useSyncExternalStore rather than a useEffect +
   setState: localStorage does not exist during SSR, so the server snapshot is
   empty and the cached rows arrive after hydration without a mismatch. */
const getSnapshot = useCallback(() => getStoredSnapshot(userId ?? ""), [userId]);
  const read = useSyncExternalStore(subscribeStored, getSnapshot, getEmptySnapshot);

  const [loadedUserId, setLoadedUserId] = useState<string | null>(null);
  /* True while the profile store is still empty, so a hard refresh does not
     flash the empty state before the first read has been attempted. */
  const loading = !hydrated || (Boolean(userId) && loadedUserId !== userId);

  const [reloadKey, setReloadKey] = useState(0);

  const seenRef = useRef(new Set<string>());

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    const supabase = createClient();

    /* Two reads: the rows to render, and an exact total. Deriving the count
       from the rows would silently under-report once a viewer has more unread
       than the row cap. */
    Promise.all([
      supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", userId)
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(MAX_UNREAD_ROWS),
      supabase
        .from("notifications")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", userId)
        .eq("is_read", false),
    ])
      .then(([rowsResult, countResult]) => {
        if (cancelled) return;

        if (rowsResult.error) {
          setError(rowsResult.error.message);
        } else {
          const rows = (rowsResult.data ?? []) as NotificationRow[];
          rows.forEach((row) => seenRef.current.add(row.id));
          setUnread(rows);
          setUnreadCount(countResult.count ?? rows.length);
          setError(null);
        }

        setLoadedUserId(userId);
      });

    return () => {
      cancelled = true;
    };
  }, [userId, reloadKey]);

  /* Stable across renders: it touches only refs and the setters, so the channel
     listener is registered once rather than on every update. */
  const handleInsert = useCallback((row: NotificationRow) => {
    if (seenRef.current.has(row.id)) return;
    seenRef.current.add(row.id);

    setUnread((prev) => [row, ...prev.filter((n) => n.id !== row.id)].slice(0, MAX_UNREAD_ROWS));
    setUnreadCount((count) => count + 1);

    const toast = toToast(row);
    if (toast) {
      setIncoming((prev) => (prev.some((t) => t.id === toast.id) ? prev : [...prev, toast]));
    }
  }, []);

  useEffect(() => {
    if (!userId) return;
    return listenForInserts(userId, handleInsert);
  }, [userId, handleInsert]);

  /* Read and unread in one ordering. An id in both means a previous mark
     never reached the database; unread wins, so it shows as unread again rather
     than being masked by the cache. */
  const notifications = useMemo<NotificationViewItem[]>(() => {
    const unreadIds = new Set(unread.map((row) => row.id));

    const unreadItems = unread
      .map((row) => toStored(row))
      .filter((row): row is StoredRow => row !== null)
      .map((row) => toView(row, false));

    const readItems = read
      .filter((row) => !unreadIds.has(row.id))
      .map((row) => toView(row, true));

    return [...unreadItems, ...readItems].sort(byCreatedDesc);
  }, [unread, read]);

  /** Optimistic: the row leaves the unread set and joins the local read history
   *  immediately, and the write follows. A failed write puts it back and
   *  surfaces the error, so the badge cannot silently disagree with the db. */
  const markRead = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;

      const previousUnread = unread;
      const previousCount = unreadCount;
      const previousStored = read;
      const now = new Date().toISOString();

      const moving = unread.filter((row) => ids.includes(row.id));
      const movedStored = moving
        .map((row) => toStored(row))
        .filter((row): row is StoredRow => row !== null);

      setUnread((prev) => prev.filter((row) => !ids.includes(row.id)));
      setUnreadCount((count) => Math.max(count - movedStored.length, 0));
      if (userId) {
        persistStored(userId, pruneStored([...movedStored, ...read]));
      }

      const supabase = createClient();
      const { error: writeError } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: now })
        .in("id", ids);

      if (writeError) {
        setUnread(previousUnread);
        setUnreadCount(previousCount);
        if (userId) persistStored(userId, previousStored);
        setError(writeError.message);
      }
    },
    [unread, unreadCount, read, userId]
  );

  const markAllRead = useCallback(async () => {
    await markRead(unread.map((row) => row.id));
  }, [unread, markRead]);

  const refresh = useCallback(() => {
    setReloadKey((key) => key + 1);
  }, []);

  return {
    notifications,
    unreadCount,
    incoming,
    loading,
    error,
    markRead,
    markAllRead,
    refresh,
  };
}