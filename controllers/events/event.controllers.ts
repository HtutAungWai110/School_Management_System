import { NextRequest, NextResponse } from "next/server";

import { EventsService, type EventPostInput } from "@/services/events/services";
import { handleError } from "@/lib/errors/error.handler";
import { HttpError } from "@/lib/errors/http.error";
import { readPathUuid } from "@/lib/api.util";
import type {
  AnnouncementAttachments,
  AnnouncementImage,
  AnnouncementLink,
} from "@/types/announcement.type";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const MAX_CONTENT = 5000;
const MAX_LINKS = 20;
const MAX_IMAGES = 20;
const MAX_ATTACHMENT_URL = 2048;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

function readPage(value: string | null) {
  const parsed = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function readLimit(value: string | null) {
  const parsed = Number.parseInt(value ?? String(DEFAULT_PAGE_SIZE), 10);
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PAGE_SIZE;
  return Math.min(parsed, MAX_PAGE_SIZE);
}

/** `2026-02-31` matches the shape but is not a calendar date. */
function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !DATE.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export class EventAnnouncementsController {
  static async list(request: NextRequest) {
    const page = readPage(request.nextUrl.searchParams.get("page"));
    const limit = readLimit(request.nextUrl.searchParams.get("limit"));

    try {
      const data = await EventsService.list(page, limit);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getById(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const { id: postId, error } = readPathUuid(id, "post id");
    if (error) return error;
    if (!postId) {
      return NextResponse.json({ error: "The post id must be a valid uuid" }, { status: 400 });
    }

    try {
      const data = await EventsService.getById(postId);

      if (!data) {
        return NextResponse.json({ error: "That post no longer exists" }, { status: 404 });
      }

      return NextResponse.json({ data });
    } catch (error) {
      return handleError(error);
    }
  }

  /**
   * Body: `{ type, content?, start_date?, start_time?, registration_deadline?,
   * attachments: { links, images } }`.
   *
   * Schedule fields are required for `event` and forced to null for
   * `announcement`, so a post can never advertise a registration that has no
   * opening date or a plain memo that carries a stale deadline.
   */
  static async create(request: NextRequest) {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    try {
      const data = await EventsService.create(readPost(body));
      return NextResponse.json(data, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }

  static async update(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const { id: postId, error } = readPathUuid(id, "post id");
    if (error) return error;
    if (!postId) {
      return NextResponse.json({ error: "The post id must be a valid uuid" }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;

    try {
      const data = await EventsService.update(postId, readPost(body));
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async remove(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const { id: postId, error } = readPathUuid(id, "post id");
    if (error) return error;
    if (!postId) {
      return NextResponse.json({ error: "The post id must be a valid uuid" }, { status: 400 });
    }

    try {
      await EventsService.remove(postId);
      return NextResponse.json({ success: true });
    } catch (error) {
      return handleError(error);
    }
  }
}

function readPost(body: Record<string, unknown> | null): EventPostInput {
  const type = body?.type;
  if (type !== "event" && type !== "announcement") {
    throw new HttpError(400, "The type must be either event or announcement");
  }

  const content = readContent(body?.content);
  const attachments = readAttachments(body?.attachments);
  assertHasBody(content, attachments);

  let startDate: string | null = null;
  let startTime: string | null = null;
  let registrationDeadline: string | null = null;

  if (type === "event") {
    const rawStartDate = body?.start_date;
    const rawStartTime = body?.start_time;
    const rawDeadline = body?.registration_deadline;

    if (!isCalendarDate(rawStartDate)) {
      throw new HttpError(400, "A valid start date is required for events");
    }
    if (typeof rawStartTime !== "string" || !TIME.test(rawStartTime)) {
      throw new HttpError(400, "A valid start time is required for events");
    }
    if (typeof rawDeadline !== "string" || Number.isNaN(Date.parse(rawDeadline))) {
      throw new HttpError(400, "A valid registration deadline is required for events");
    }

    startDate = rawStartDate;
    startTime = rawStartTime;
    registrationDeadline = new Date(rawDeadline).toISOString();
  }

  return { type, content, startDate, startTime, registrationDeadline, attachments };
}

function readContent(input: unknown): string | null {
  const content = typeof input === "string" ? input.trim() : "";

  if (content.length > MAX_CONTENT) {
    throw new HttpError(400, `A post can be at most ${MAX_CONTENT} characters`);
  }

  return content || null;
}

function assertHasBody(content: string | null, attachments: AnnouncementAttachments) {
  const hasAttachments = attachments.links.length > 0 || attachments.images.length > 0;

  /* Content or attachments, not necessarily both: a photo-only event poster is
     legitimate, an entirely empty post is not. */
  if (!content && !hasAttachments) {
    throw new HttpError(400, "Write something or attach at least one link or image");
  }
}

/** Accepts an absolute http(s) address, or nothing. `new URL` alone is not
 *  enough: it happily parses `javascript:alert(1)`, and these values end up in
 *  an `href` when the post is rendered. */
function readAttachmentUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || trimmed.length > MAX_ATTACHMENT_URL) return null;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function readAttachments(input: unknown): AnnouncementAttachments {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const rawLinks = Array.isArray(source.links) ? source.links : [];
  const rawImages = Array.isArray(source.images) ? source.images : [];

  if (rawLinks.length > MAX_LINKS) {
    throw new HttpError(400, `A post can hold at most ${MAX_LINKS} links`);
  }
  if (rawImages.length > MAX_IMAGES) {
    throw new HttpError(400, `A post can hold at most ${MAX_IMAGES} images`);
  }

  const links: AnnouncementLink[] = rawLinks.map((item, index) => {
    const record = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const url = readAttachmentUrl(record.url);

    if (!url) {
      throw new HttpError(400, `Link ${index + 1} is not a valid http or https address`);
    }

    const label =
      typeof record.label === "string" && record.label.trim()
        ? record.label.trim().slice(0, 120)
        : null;

    return { url, label };
  });

  const images: AnnouncementImage[] = rawImages.map((item, index) => {
    const record = (typeof item === "object" && item !== null ? item : {}) as Record<string, unknown>;
    const url = readAttachmentUrl(record.url);
    const path = typeof record.path === "string" ? record.path.trim() : "";

    if (!url) {
      throw new HttpError(400, `Image ${index + 1} is missing a valid url`);
    }
    /* The path is a bucket key. Rejecting traversal and absolute paths keeps a
       stored post from pointing the delete path outside its folder. */
    if (!path || path.startsWith("/") || path.includes("..")) {
      throw new HttpError(400, `Image ${index + 1} is missing a valid storage path`);
    }

    const name =
      typeof record.name === "string" && record.name.trim()
        ? record.name.trim().slice(0, 200)
        : path.split("/").pop() || "image";

    return { url, path, name };
  });

  return { links, images };
}
