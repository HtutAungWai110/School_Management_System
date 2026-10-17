/** Mirrors `notifications.type` (a plain text column, not an enum). */
export type NotificationType =
  | "profile_updated"
  | "timetable_scheduled"
  | "timetable_updated"
  | "timetable_swapped"
  | "attendance_checked_in"
  | "enrollment_requested"
  | "batch_assigned"
  | "assignment_submitted";

/** Shape of `notifications.data`. Deliberately display-only: the row itself
 *  already carries recipient/sender/type, so anything needed to render a link
 *  and a sentence belongs here. */
export type NotificationData = {
  message: string;
  link: string;
};

export type NotificationRow = {
  id: string;
  recipient_id: string;
  sender_id: string | null;
  type: NotificationType | string;
  data: NotificationData | Record<string, never>;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type CreateNotificationPayload = {
  data: NotificationData;
  /** One row is written per sender, because `sender_id` is scalar. An empty
   *  array marks the notification as system-originated (null sender). */
  senderIds: string[];
  recipientId: string;
  type: NotificationType;
};

/** Display-only projection of a row, used by the toast. */
export type NotificationToast = {
  id: string;
  message: string;
  link: string;
  created_at: string;
};