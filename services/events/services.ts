import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";
import type {
  EventAnnouncement,
  EventAnnouncementData,
  EventAnnouncementPage,
  EventAnnouncementType,
} from "@/types/event-announcement.type";
import type { AnnouncementAttachments } from "@/types/announcement.type";

/**
 * Author joins go through `profiles`, which the admin role can read in full.
 * Registrations are embedded as an aggregate so the list can show how full an
 * event is without a second round trip per card.
 */
const EVENT_SELECT = `
  id,
  type,
  content,
  data,
  like_count,
  start_date,
  start_time,
  registration_deadline,
  author_id,
  created_at,
  updated_at,
  profiles ( id, full_name, avatar_url ),
  event_registrations ( count )
`;

const EVENT_BUCKET = "event_annoncements";

export type EventPostInput = {
  type: EventAnnouncementType;
  content: string | null;
  startDate: string | null;
  startTime: string | null;
  registrationDeadline: string | null;
  attachments: AnnouncementAttachments;
};

type EventAnnouncementRow = Omit<EventAnnouncement, "registration_count"> & {
  event_registrations?: { count: number }[] | null;
};

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** PostgREST returns aggregates as a one-element array; flatten it here so
 *  every consumer sees the same `registration_count` number. */
function normalise(rows: EventAnnouncementRow[]): EventAnnouncement[] {
  return rows.map(({ event_registrations, ...row }) => ({
    ...row,
    registration_count: event_registrations?.[0]?.count ?? 0,
  }));
}

/** Storage keys held by a stored `data.attachments` blob. */
function storedImagePaths(data: EventAnnouncementData): string[] {
  const images = data?.attachments?.images;
  if (!Array.isArray(images)) return [];

  return images
    .map((image) => image?.path)
    .filter((path): path is string => typeof path === "string" && path.length > 0);
}

/**
 * Best effort on purpose. Every caller reaches this after the row already
 * points elsewhere; throwing here would report a save that did succeed. The
 * worst case is an unreferenced object, which is cheaper than a false failure.
 */
async function removeFromBucket(supabase: ServerSupabase, paths: string[]) {
  if (paths.length === 0) return;

  try {
    const { error } = await supabase.storage.from(EVENT_BUCKET).remove(paths);

    if (error) {
      console.error("Could not remove event announcement images from storage:", error);
    }
  } catch (error) {
    console.error("Could not remove event announcement images from storage:", error);
  }
}

async function signedInUserId(supabase: ServerSupabase) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new HttpError(401, "You must be signed in to continue");
  }

  return user.id;
}

/** Loads the author check and the current attachment list in one read. */
async function readManagedPost(supabase: ServerSupabase, id: string, userId: string) {
  const { data, error } = await supabase
    .from("event_announcements")
    .select("author_id, data")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new HttpError(404, "That post no longer exists");
  }

  const row = data as { author_id: string; data: EventAnnouncementData };

  /* Hiding the kebab in the UI is not an authorization boundary; the storage
     cleanup below runs privileged deletes, so the author is re-checked here. */
  if (row.author_id !== userId) {
    throw new HttpError(403, "Only the author can manage this post");
  }

  return row;
}

export class EventsService {
  static async list(page: number, limit: number): Promise<EventAnnouncementPage> {
    const supabase = await createClient();
    const from = (page - 1) * limit;

    const { data, error, count } = await supabase
      .from("event_announcements")
      .select(EVENT_SELECT, { count: "exact" })
      /* `id` is the tie-breaker: posts created in the same second would
         otherwise shuffle between pages. */
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    const total = count ?? 0;

    return {
      data: normalise((data ?? []) as unknown as EventAnnouncementRow[]),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  static async getById(id: string): Promise<EventAnnouncement | null> {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("event_announcements")
      .select(EVENT_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return data ? normalise([data as unknown as EventAnnouncementRow])[0] : null;
  }

  static async create(input: EventPostInput): Promise<EventAnnouncement> {
    const supabase = await createClient();

    /* The author comes from the session: the insert policy requires
       `auth.uid() = author_id`, so trusting the body would just 42501. */
    const userId = await signedInUserId(supabase);

    const { data, error } = await supabase
      .from("event_announcements")
      .insert({
        type: input.type,
        content: input.content,
        data: { attachments: input.attachments },
        start_date: input.startDate,
        start_time: input.startTime,
        registration_deadline: input.registrationDeadline,
        author_id: userId,
      })
      .select(EVENT_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return normalise([data as unknown as EventAnnouncementRow])[0];
  }

  static async update(id: string, input: EventPostInput): Promise<EventAnnouncement> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);
    const existing = await readManagedPost(supabase, id, userId);

    const { data, error } = await supabase
      .from("event_announcements")
      .update({
        type: input.type,
        content: input.content,
        data: { attachments: input.attachments },
        start_date: input.startDate,
        start_time: input.startTime,
        registration_deadline: input.registrationDeadline,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("author_id", userId)
      .select(EVENT_SELECT)
      .single();

    if (error) {
      throw new Error(error.message);
    }

    /* Only keys that were stored and are no longer referenced are removed. The
       request cannot nominate an arbitrary object for deletion, and an upload
       that failed midway leaves the previous row intact. */
    const kept = new Set(input.attachments.images.map((image) => image.path));
    const removed = storedImagePaths(existing.data).filter((path) => !kept.has(path));
    await removeFromBucket(supabase, removed);

    return normalise([data as unknown as EventAnnouncementRow])[0];
  }

  static async remove(id: string): Promise<void> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);
    const existing = await readManagedPost(supabase, id, userId);

    const { error } = await supabase
      .from("event_announcements")
      .delete()
      .eq("id", id)
      .eq("author_id", userId);

    if (error) {
      throw new Error(error.message);
    }

    await removeFromBucket(supabase, storedImagePaths(existing.data));
  }
}
