import type { AnnouncementAttachments } from "./announcement.type";

/** The two shapes one post can take. An `event` opens registrations, an
 *  `announcement` is informational only. Matches the `event_type` enum. */
export type EventAnnouncementType = "event" | "announcement";

/** Payload kept in the `data` jsonb column; mirrors batch announcements. */
export type EventAnnouncementData = {
  attachments?: AnnouncementAttachments;
} | null;

export type EventAnnouncementAuthor = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type EventAnnouncement = {
  id: string;
  type: EventAnnouncementType | null;
  content: string | null;
  data: EventAnnouncementData;
  like_count: number;
  /**
   * All three schedule fields are set for `event` posts and null for plain
   * announcements.
   */
  start_date: string | null;
  /** `HH:MM:SS` as Postgres returns time columns. */
  start_time: string | null;
  registration_deadline: string | null;
  author_id: string;
  created_at: string;
  updated_at: string | null;
  profiles: EventAnnouncementAuthor | null;
  registration_count: number;
};

export type EventAnnouncementPage = {
  data: EventAnnouncement[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
