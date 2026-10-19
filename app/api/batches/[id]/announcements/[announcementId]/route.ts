import { NextRequest } from "next/server";
import { BatchController } from "@/controllers/batches/batch.controllers";

export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) => {
  return BatchController.getAnnouncement(request, { params });
};

/** Body: `{ content, attachments: { links, images } }` — the complete set the
 *  announcement should end up with, not a patch of individual fields.
 *
 *  As with POST, image files never reach this route: new files are uploaded to
 *  the bucket first and sent as public urls. Images dropped from the payload
 *  are deleted from the bucket after the row is saved, so a failed update can
 *  never strand an announcement without its pictures. */
export const PATCH = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) => {
  return BatchController.updateAnnouncement(request, { params });
};

/** Removes the row (likes and comments cascade) and then its images. */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) => {
  return BatchController.deleteAnnouncement(request, { params });
};
