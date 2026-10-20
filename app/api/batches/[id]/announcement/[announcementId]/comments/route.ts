import { NextRequest } from "next/server";
import { BatchController } from "@/controllers/batches/batch.controllers";

/** `?page=` is one-based and `?limit=` defaults to 50, the largest page the
 *  route accepts. Both are validated; a malformed value is a 400, not an
 *  empty page. The signed-in user's own comments are excluded here; they are
 *  served newest-first by the sibling `/mine` route. */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) => {
  return BatchController.getAnnouncementComments(request, { params });
};

/** Body: `{ content }`. The author comes from the session, not the payload. */
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) => {
  return BatchController.createAnnouncementComment(request, { params });
};
