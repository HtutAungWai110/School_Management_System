import { NextRequest, NextResponse } from "next/server";
import { NotificationsService } from "@/services/notifications/services";
import { handleError } from "@/lib/errors/error.handler";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export class NotificationsController {
  static async list(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    /* No paging: the page merges this with read notifications cached in
       localStorage, which the server cannot know about, so server-side pages
       could never describe the rendered list. A single capped read is the only
       coherent option. */
    const limit = Math.min(Math.max(parseInt(params.get("limit") ?? "50", 10) || 50, 1), 200);

    try {
      const data = await NotificationsService.list(limit);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  /** Body `{ ids: string[] }`. Batched, because an IntersectionObserver can
   *  report several rows becoming visible in one callback. */
  static async markRead(request: NextRequest) {
    const body = await request.json().catch(() => ({ ids: undefined }));
    const { ids } = body as { ids?: unknown };

    /* Ids are validated before they reach Postgres: an unvalidated value would
       raise invalid input syntax for type uuid and surface as a 500. */
    const targets = Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string" && UUID.test(id)) : [];

    try {
      await NotificationsService.markRead(targets);
      return NextResponse.json({ success: true });
    } catch (error) {
      return handleError(error);
    }
  }
}