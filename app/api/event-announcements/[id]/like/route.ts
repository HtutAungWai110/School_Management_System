import { NextRequest } from "next/server";

import { EventAnnouncementsController } from "@/controllers/events/event.controllers";

/** Idempotent: liking an already liked post leaves the row and counter as-is. */
export const POST = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return EventAnnouncementsController.like(request, { params });
};

/** Idempotent: unliking a post that is not liked is a no-op. */
export const DELETE = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return EventAnnouncementsController.unlike(request, { params });
};
