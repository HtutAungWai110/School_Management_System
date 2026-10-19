import { NextRequest } from "next/server";
import { BatchController } from "@/controllers/batches/batch.controllers";

export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return BatchController.getAnnouncements(request, { params });
};

/** Body: `{ content, attachments: { links, images } }`.
 *
 *  Image files never reach this route. The browser uploads them to the
 *  `batch_announcements` bucket first and sends the resulting public urls, so
 *  this handler only ever deals with JSON. */
export const POST = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return BatchController.createAnnouncement(request, { params });
};
