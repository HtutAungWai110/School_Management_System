import { NextRequest } from "next/server";
import { BatchController } from "@/controllers/batches/batch.controllers";

/** The signed-in user's comments for this announcement, newest first.
 *
 *  The profile id comes from the session, never from the query string, so a
 *  caller cannot ask for someone else's "own" list. */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) => {
  return BatchController.getOwnAnnouncementComments(request, { params });
};
