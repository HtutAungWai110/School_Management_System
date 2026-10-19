import { NextRequest } from "next/server";
import { BatchController } from "@/controllers/batches/batch.controllers";

/** Idempotent: liking an already liked post leaves the row and counter as-is. */
export const POST = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) => {
  return BatchController.likeAnnouncement(request, { params });
};

/** Idempotent: unliking a post that is not liked is a no-op. */
export const DELETE = async (
  request: NextRequest,
  { params }: { params: Promise<{ id: string; announcementId: string }> }
) => {
  return BatchController.unlikeAnnouncement(request, { params });
};
