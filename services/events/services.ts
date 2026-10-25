import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";
import { NotificationsService } from "@/services/notifications/services";
import type {
  EventAnnouncement,
  EventAnnouncementData,
  EventAnnouncementPage,
  EventAnnouncementType,
  EventRegistration,
  EventRegistrationPage,
} from "@/types/event-announcement.type";
import type { AnnouncementAttachments, AnnouncementAuthor } from "@/types/announcement.type";

/**
 * Authors and registration totals are resolved with security-definer RPCs.
 * `profiles` is only readable by admins, and `event_registrations` only
 * exposes the caller's own rows, so neither can be embedded for the student
 * and teacher feeds.
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
  updated_at
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

type EventAnnouncementRow = Omit<EventAnnouncement, "registration_count" | "profiles">;

type ServerSupabase = Awaited<ReturnType<typeof createClient>>;

/** Display fields for a set of authors, via the public profile summaries. */
async function loadProfileSummaries(
  supabase: ServerSupabase,
  ids: string[]
): Promise<Map<string, AnnouncementAuthor>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_profile_summaries", {
    p_ids: uniqueIds,
  });

  if (error) throw new Error(error.message);

  return new Map(
    ((data ?? []) as AnnouncementAuthor[]).map((profile) => [profile.id, profile])
  );
}

/** Total registrations per event, readable without the registration rows. */
async function loadRegistrationCounts(
  supabase: ServerSupabase,
  ids: string[]
): Promise<Map<string, number>> {
  const uniqueIds = [...new Set(ids)];
  if (uniqueIds.length === 0) return new Map();

  const { data, error } = await supabase.rpc("get_event_registration_counts", {
    p_ids: uniqueIds,
  });

  if (error) throw new Error(error.message);

  return new Map(
    (
      (data ?? []) as { event_id: string; registration_count: number | string }[]
    ).map((row) => [row.event_id, Number(row.registration_count)])
  );
}

/** Attaches byline and registration total to rows selected without joins. */
async function decorate(
  supabase: ServerSupabase,
  rows: EventAnnouncementRow[]
): Promise<EventAnnouncement[]> {
  if (rows.length === 0) return [];

  const [authors, counts] = await Promise.all([
    loadProfileSummaries(
      supabase,
      rows.map((row) => row.author_id).filter(Boolean)
    ),
    loadRegistrationCounts(
      supabase,
      rows.map((row) => row.id)
    ),
  ]);

  return rows.map((row) => ({
    ...row,
    profiles: authors.get(row.author_id) ?? null,
    registration_count: counts.get(row.id) ?? 0,
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
    const rows = (data ?? []) as unknown as EventAnnouncementRow[];

    return {
      data: await decorate(supabase, rows),
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

    return data
      ? (await decorate(supabase, [data as unknown as EventAnnouncementRow]))[0]
      : null;
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

    return (await decorate(supabase, [data as unknown as EventAnnouncementRow]))[0];
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

    return (await decorate(supabase, [data as unknown as EventAnnouncementRow]))[0];
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

  static async isLiked(id: string): Promise<boolean> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);

    const { data, error } = await supabase
      .from("event_announcements_likes")
      .select("id")
      .eq("announcement_id", id)
      .eq("profile_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data);
  }

  /**
   * Sets the viewer's like to `liked` and reports the counter afterwards.
   *
   * Idempotent on purpose: an optimistic button can repeat a request, so a
   * second like is a no-op and a second unlike deletes nothing. The database
   * trigger owns the counter, so the response reports what the row actually
   * holds rather than a number guessed by the client.
   */
  static async setLike(
    id: string,
    liked: boolean
  ): Promise<{ liked: boolean; likes_count: number }> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);

    /* Reading the post first turns an unknown id into a 404 instead of a
       foreign-key 500. Select policy is public, so this only proves existence. */
    const { data: post, error: postError } = await supabase
      .from("event_announcements")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (postError) {
      throw new Error(postError.message);
    }
    if (!post) {
      throw new HttpError(404, "That post no longer exists");
    }

    if (liked) {
      /* The unique key makes a repeated tap a no-op rather than an error, and a
         skipped insert leaves the trigger's counter untouched. */
      const { error } = await supabase.from("event_announcements_likes").upsert(
        { announcement_id: id, profile_id: userId },
        { onConflict: "announcement_id,profile_id", ignoreDuplicates: true }
      );

      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase
        .from("event_announcements_likes")
        .delete()
        .eq("announcement_id", id)
        .eq("profile_id", userId);

      if (error) throw new Error(error.message);
    }

    const { data: counts, error: countError } = await supabase
      .from("event_announcements")
      .select("like_count")
      .eq("id", id)
      .maybeSingle();

    if (countError) {
      throw new Error(countError.message);
    }

    return {
      liked,
      likes_count: (counts as { like_count: number } | null)?.like_count ?? 0,
    };
  }

  static async isRegistered(id: string): Promise<boolean> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);

    const { data, error } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", id)
      .eq("profile_id", userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return Boolean(data);
  }

  /**
   * Registers the signed-in student or teacher for an event.
   *
   * The caller's profile comes from the session, and the post is read first so
   * a non-event, a missing post, or a closed deadline is a clear 400/404 rather
   * than a foreign-key or policy error. A repeated submit is a no-op, backed by
   * the unique `(event_id, profile_id)` key.
   */
  static async register(
    id: string,
    message: string | null
  ): Promise<{ registered: boolean }> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);

    const { data: post, error: postError } = await supabase
      .from("event_announcements")
      .select("type, content, registration_deadline")
      .eq("id", id)
      .maybeSingle();

    if (postError) {
      throw new Error(postError.message);
    }
    if (!post) {
      throw new HttpError(404, "That post no longer exists");
    }

    const event = post as {
      type: EventAnnouncementType | null;
      content: string | null;
      registration_deadline: string | null;
    };

    if (event.type !== "event") {
      throw new HttpError(400, "Only events accept registrations");
    }

    if (
      event.registration_deadline &&
      new Date(event.registration_deadline).getTime() < Date.now()
    ) {
      throw new HttpError(400, "Registration for this event has already closed");
    }

    const { data: existing, error: existingError } = await supabase
      .from("event_registrations")
      .select("id")
      .eq("event_id", id)
      .eq("profile_id", userId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message);
    }
    if (existing) return { registered: true };

    const { data: inserted, error } = await supabase
      .from("event_registrations")
      .insert({
        event_id: id,
        profile_id: userId,
        message,
      })
      .select("id")
      .single();

    if (error) {
      /* 23505: a concurrent submit won the race. The user is registered either
         way, so report success instead of surfacing a constraint error. The
         winning request sends the notification, so this one stays silent. */
      if (error.code === "23505") return { registered: true };
      throw new Error(error.message);
    }

    const registrationId = (inserted as { id?: string } | null)?.id;

    if (registrationId) {
      const { data: actor } = await supabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", userId)
        .maybeSingle();

      const profile = actor as {
        full_name: string | null;
        role: string;
      } | null;

      /* Never blocks the registration: the row is already committed, and the
         notification helper swallows its own failures. */
      await NotificationsService.notifyAdminsOfEventRegistration({
        actorId: userId,
        actorName: profile?.full_name ?? "",
        actorRole: profile?.role ?? "student",
        eventId: id,
        eventContent: event.content,
        registrationId,
      });
    }

    return { registered: true };
  }

  /**
   * One page of the registrations for an event, admin-only.
   *
   * The role is checked here rather than inferred from RLS: an admin policy
   * would let the row through, but a student policy would quietly return a
   * one-row list instead of an error, which would look like a working page.
   */
  static async listRegistrations(
    eventId: string,
    page: number,
    limit: number,
    registrationId?: string
  ): Promise<EventRegistrationPage> {
    const supabase = await createClient();
    const userId = await signedInUserId(supabase);

    const { data: viewer, error: viewerError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    if (viewerError) {
      throw new Error(viewerError.message);
    }
    if ((viewer as { role?: string } | null)?.role !== "admin") {
      throw new HttpError(403, "Only admins can review registrations");
    }

    const { data: event, error: eventError } = await supabase
      .from("event_announcements")
      .select("id")
      .eq("id", eventId)
      .maybeSingle();

    if (eventError) {
      throw new Error(eventError.message);
    }
    if (!event) {
      throw new HttpError(404, "That post no longer exists");
    }

    const from = (page - 1) * limit;

    let query = supabase
      .from("event_registrations")
      .select("id, event_id, profile_id, message, created_at", { count: "exact" })
      .eq("event_id", eventId);

    /* A notification deep-links to one registration, so the filter narrows
       the list rather than sitting beside it: the id and the event id both
       have to match, or a link from the wrong event finds nothing. */
    if (registrationId) {
      query = query.eq("id", registrationId);
    }

    const { data, error, count } = await query
      /* `id` is the tie-breaker so simultaneous registrations do not shuffle
         between pages. */
      .order("created_at", { ascending: false })
      .order("id", { ascending: true })
      .range(from, from + limit - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as Omit<EventRegistration, "profile">[];
    const profiles = await loadProfileSummaries(
      supabase,
      rows.map((row) => row.profile_id)
    );

    const total = count ?? 0;

    return {
      data: rows.map((row) => ({
        ...row,
        profile: profiles.get(row.profile_id) ?? null,
      })),
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }
}
