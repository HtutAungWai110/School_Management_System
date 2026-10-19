import { NextRequest } from "next/server";
import { BatchController } from "@/controllers/batches/batch.controllers";

/** Whether the signed-in viewer has already liked the announcement. */
export const GET = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) => {
  return BatchController.isAnnouncementLiked(request, { params });
};
