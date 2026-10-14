import { createClient } from "@/lib/supabase/server.client";
import type { CreateNotificationPayload, NotificationRow } from "@/types/notification.type";

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
}