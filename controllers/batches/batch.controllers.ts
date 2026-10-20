import { NextRequest, NextResponse } from "next/server";
import { BatchesService } from "@/services/batches/services";
import { handleError } from "@/lib/errors/error.handler";
import { HttpError } from "@/lib/errors/http.error";
import { readPathUuid } from "@/lib/api.util";
import type { AnnouncementAttachments, AnnouncementImage, AnnouncementLink } from "@/types/announcement.type";

const MAX_ANNOUNCEMENT_CONTENT = 5000;
const MAX_ANNOUNCEMENT_LINKS = 20;
const MAX_ANNOUNCEMENT_IMAGES = 20;
const MAX_ATTACHMENT_URL = 2048;
const MAX_COMMENT_CONTENT = 2000;
const MAX_COMMENT_PAGE_SIZE = 50;

export class BatchController {
  static async list(request: NextRequest) {
    const search = request.nextUrl.searchParams.get("search") ?? "";
    const status = request.nextUrl.searchParams.get("filter") ?? "";

    try {
      const data = await BatchesService.list(search, status);
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

    try {
      const data = await BatchesService.getById(id);
      return NextResponse.json({ data });
    } catch (error) {
      return handleError(error);
    }
  }

  static async create(request: NextRequest) {
    const body = await request.json().catch(() => ({ batch_name: undefined, level_ids: undefined }));
    const { batch_name, level_ids } = body;

    if (!batch_name || typeof batch_name !== "string" || !batch_name.trim()) {
      return NextResponse.json({ error: "Batch name is required" }, { status: 400 });
    }

    if (!Array.isArray(level_ids) || level_ids.length === 0) {
      return NextResponse.json({ error: "At least one level is required" }, { status: 400 });
    }

    try {
      const data = await BatchesService.create(batch_name, level_ids);
      return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }

  static async update(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { batch_name, status } = body;

    if (batch_name !== undefined && (typeof batch_name !== "string" || !batch_name.trim())) {
      return NextResponse.json({ error: "Batch name is required" }, { status: 400 });
    }

    if (status !== undefined && status !== "ongoing" && status !== "completed") {
      return NextResponse.json({ error: "Invalid batch status" }, { status: 400 });
    }

    if (batch_name === undefined && status === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    try {
      const data = await BatchesService.update(id, { batch_name, status });
      return NextResponse.json({ data });
    } catch (error) {
      return handleError(error);
    }
  }

  static async removeAssignment(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; assignmentId: string }> }
  ) {
    const { id, assignmentId } = await params;

    try {
      const result = await BatchesService.removeAssignment(assignmentId, id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async remove(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const result = await BatchesService.remove(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getBatchModules(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const result = await BatchesService.getBatchModules(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getAssignments(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const result = await BatchesService.getAssignments(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async removeAssignmentsBulk(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const body = await request.json().catch(() => ({ assignmentIds: undefined }));
    const { assignmentIds } = body;

    if (
      !Array.isArray(assignmentIds) ||
      assignmentIds.length === 0 ||
      assignmentIds.some((value) => typeof value !== "string")
    ) {
      return NextResponse.json(
        { error: "assignmentIds must be a non-empty array of ids" },
        { status: 400 }
      );
    }

    try {
      const result = await BatchesService.bulkRemoveAssignments(assignmentIds as string[], id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getTeacherModules(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const result = await BatchesService.getTeacherModules(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async createAssignment(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const body = await request.json().catch(() => ({
      module_id: undefined,
      teacher_id: undefined,
      deadline_at: undefined,
    }));
    const { module_id, teacher_id, deadline_at } = body;

    if (!module_id || typeof module_id !== "string") {
      return NextResponse.json({ error: "module_id is required" }, { status: 400 });
    }

    if (!teacher_id || typeof teacher_id !== "string") {
      return NextResponse.json({ error: "teacher_id is required" }, { status: 400 });
    }

    try {
      const data = await BatchesService.createAssignment(id, module_id, teacher_id, deadline_at ?? null);
      return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }

  static async getAnnouncements(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const { id: batchId, error: idError } = readPathUuid(id, "batch id");
    if (idError) return idError;
    /* Unreachable alongside idError, but the reader's success type is widened
       to `string | undefined`, so this is what narrows it for the service. */
    if (!batchId) {
      return NextResponse.json({ error: "The batch id must be a valid uuid" }, { status: 400 });
    }

    try {
      const data = await BatchesService.getAnnouncements(batchId);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async createAnnouncement(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const { id: batchId, error: idError } = readPathUuid(id, "batch id");
    if (idError) return idError;
    if (!batchId) {
      return NextResponse.json({ error: "The batch id must be a valid uuid" }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));

    try {
      const content = readAnnouncementContent(body?.content);
      const attachments = readAnnouncementAttachments(body?.attachments);
      assertAnnouncementHasBody(content, attachments);

      const data = await BatchesService.createAnnouncement(batchId, content, attachments);
      return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }

  static async getAnnouncement(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; announcementId: string }> }
  ) {
    const path = await readAnnouncementPath(params);
    if ("error" in path) return path.error;

    try {
      const data = await BatchesService.getAnnouncement(path.batchId, path.announcementId);

      if (!data) {
        return NextResponse.json({ error: "That announcement no longer exists" }, { status: 404 });
      }

      return NextResponse.json({ data });
    } catch (error) {
      return handleError(error);
    }
  }

  static async isAnnouncementLiked(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; announcementId: string }> }
  ) {
    const path = await readAnnouncementPath(params);
    if ("error" in path) return path.error;

    try {
      const liked = await BatchesService.isAnnouncementLiked(path.batchId, path.announcementId);
      return NextResponse.json({ liked });
    } catch (error) {
      return handleError(error);
    }
  }

  static async likeAnnouncement(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; announcementId: string }> }
  ) {
    return setAnnouncementLike(params, true);
  }

  static async unlikeAnnouncement(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; announcementId: string }> }
  ) {
    return setAnnouncementLike(params, false);
  }

  static async getAnnouncementComments(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; announcementId: string }> }
  ) {
    const path = await readAnnouncementPath(params);
    if ("error" in path) return path.error;

    const page = readPositiveInt(request.nextUrl.searchParams.get("page"), 1);
    const limit = readPositiveInt(
      request.nextUrl.searchParams.get("limit"),
      MAX_COMMENT_PAGE_SIZE
    );

    if (page === null || limit === null || limit > MAX_COMMENT_PAGE_SIZE) {
      return NextResponse.json(
        {
          error: `page must be 1 or more and limit must be between 1 and ${MAX_COMMENT_PAGE_SIZE}`,
        },
        { status: 400 }
      );
    }

    try {
      const { data, total } = await BatchesService.getAnnouncementComments(
        path.batchId,
        path.announcementId,
        page,
        limit
      );

      return NextResponse.json({
        data,
        page,
        limit,
        total,
        has_more: page * limit < total,
      });
    } catch (error) {
      return handleError(error);
    }
  }

  static async getOwnAnnouncementComments(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string; announcementId: string }> }
  ) {
    const path = await readAnnouncementPath(params);
    if ("error" in path) return path.error;

    try {
      const data = await BatchesService.getOwnAnnouncementComments(
        path.batchId,
        path.announcementId
      );

      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async createAnnouncementComment(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; announcementId: string }> }
  ) {
    const path = await readAnnouncementPath(params);
    if ("error" in path) return path.error;

    const body = await request.json().catch(() => ({}));

    try {
      const content = readCommentContent(body?.content);
      const result = await BatchesService.createAnnouncementComment(
        path.batchId,
        path.announcementId,
        content
      );

      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }

  static async updateAnnouncement(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; announcementId: string }> }
  ) {
    const path = await readAnnouncementPath(params);
    if ("error" in path) return path.error;

    const body = await request.json().catch(() => ({}));

    try {
      const content = readAnnouncementContent(body?.content);
      const attachments = readAnnouncementAttachments(body?.attachments);
      assertAnnouncementHasBody(content, attachments);

      const data = await BatchesService.updateAnnouncement(
        path.batchId,
        path.announcementId,
        content,
        attachments
      );

      return NextResponse.json({ data });
    } catch (error) {
      return handleError(error);
    }
  }

  static async deleteAnnouncement(
    request: NextRequest,
    { params }: { params: Promise<{ id: string; announcementId: string }> }
  ) {
    const path = await readAnnouncementPath(params);
    if ("error" in path) return path.error;

    try {
      await BatchesService.deleteAnnouncement(path.batchId, path.announcementId);
      return new NextResponse(null, { status: 204 });
    } catch (error) {
      return handleError(error);
    }
  }
}

type AnnouncementPath = { batchId: string; announcementId: string } | { error: NextResponse };

/** Both ids travel in the path for this endpoint; a malformed one is rejected
 *  before it reaches Postgres, where it would surface as a 500. */
async function readAnnouncementPath(
  params: Promise<{ id: string; announcementId: string }>
): Promise<AnnouncementPath> {
  const { id, announcementId } = await params;

  const batch = readPathUuid(id, "batch id");
  if (batch.error) return { error: batch.error };
  if (!batch.id) {
    return { error: NextResponse.json({ error: "The batch id must be a valid uuid" }, { status: 400 }) };
  }

  const notice = readPathUuid(announcementId, "announcement id");
  if (notice.error) return { error: notice.error };
  if (!notice.id) {
    return {
      error: NextResponse.json({ error: "The announcement id must be a valid uuid" }, { status: 400 }),
    };
  }

  return { batchId: batch.id, announcementId: notice.id };
}

async function setAnnouncementLike(
  params: Promise<{ id: string; announcementId: string }>,
  liked: boolean
) {
  const path = await readAnnouncementPath(params);
  if ("error" in path) return path.error;

  try {
    const data = await BatchesService.setAnnouncementLike(
      path.batchId,
      path.announcementId,
      liked
    );

    return NextResponse.json(data);
  } catch (error) {
    return handleError(error);
  }
}

/** Returns `null` for a value that is not a positive integer, so the caller
 *  can reject it instead of falling back to a default and hiding the typo. */
function readPositiveInt(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

/** Like announcement content, a comment is trimmed and stored without the
 *  surrounding whitespace; `""` means the caller sent nothing. */
function readCommentContent(input: unknown): string {
  const content = typeof input === "string" ? input.trim() : "";

  if (!content) {
    throw new HttpError(400, "Write something before posting a comment");
  }

  if (content.length > MAX_COMMENT_CONTENT) {
    throw new HttpError(400, `A comment can be at most ${MAX_COMMENT_CONTENT} characters`);
  }

  return content;
}

function readAnnouncementContent(input: unknown): string | null {
  const content = typeof input === "string" ? input.trim() : "";

  if (content.length > MAX_ANNOUNCEMENT_CONTENT) {
    throw new HttpError(
      400,
      `An announcement can be at most ${MAX_ANNOUNCEMENT_CONTENT} characters`
    );
  }

  return content || null;
}

function assertAnnouncementHasBody(content: string | null, attachments: AnnouncementAttachments) {
  const hasAttachments = attachments.links.length > 0 || attachments.images.length > 0;

  /* Content or attachments, not both: a photo-only notice is legitimate,
     an entirely empty one is not. */
  if (!content && !hasAttachments) {
    throw new HttpError(400, "Write something or attach at least one link or image");
  }
}

/**
 * Accepts an absolute http(s) address, or nothing.
 *
 * `new URL` alone is not enough: it happily parses `javascript:alert(1)`, and
 * these values end up in an `href` when the notice is rendered.
 */
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

function readAnnouncementAttachments(input: unknown): AnnouncementAttachments {
  const source = typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {};
  const rawLinks = Array.isArray(source.links) ? source.links : [];
  const rawImages = Array.isArray(source.images) ? source.images : [];

  if (rawLinks.length > MAX_ANNOUNCEMENT_LINKS) {
    throw new HttpError(400, `An announcement can hold at most ${MAX_ANNOUNCEMENT_LINKS} links`);
  }
  if (rawImages.length > MAX_ANNOUNCEMENT_IMAGES) {
    throw new HttpError(400, `An announcement can hold at most ${MAX_ANNOUNCEMENT_IMAGES} images`);
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
       stored announcement from pointing the delete path outside its folder. */
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
