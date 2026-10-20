/**
 * Anything an admin attaches to an announcement.
 *
 * Images keep both `url` and `path` on purpose: `url` is what renders, `path`
 * is the object key inside the `batch_announcements` bucket. Without the key a
 * later delete could only drop the URL and would leave the file orphaned.
 */
export type AnnouncementLink = {
  url: string;
  label: string | null;
};

export type AnnouncementImage = {
  url: string;
  path: string;
  name: string;
};

export type AnnouncementAttachments = {
  links: AnnouncementLink[];
  images: AnnouncementImage[];
};

export type AnnouncementAuthor = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
};

export type Announcement = {
  id: string;
  batch_id: string;
  author_id: string | null;
  content: string | null;
  attachments: AnnouncementAttachments | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  updated_at: string | null;
  /* Resolved through get_profile_summaries so students and teachers can read
     the byline without access to the profiles table. Null when the author's
     profile was deleted, which the FK handles by nulling author_id. */
  profiles: AnnouncementAuthor | null;
};

export type AnnouncementComment = {
  id: string;
  announcement_id: string;
  profile_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  /* Resolved through get_profile_summaries: the profiles table only exposes
     the caller's own row to non-admins. */
  author: AnnouncementAuthor | null;
};

/** One page of the comment endpoint, as the client receives it. */
export type AnnouncementCommentPage = {
  data: AnnouncementComment[];
  page: number;
  limit: number;
  total: number;
  has_more: boolean;
};

