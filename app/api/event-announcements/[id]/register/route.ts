import { NextRequest } from "next/server";

import { EventAnnouncementsController } from "@/controllers/events/event.controllers";

/**
 * Registers the signed-in student or teacher for an event.
 * Idempotent: submitting twice leaves a single registration.
 */
export const POST = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return EventAnnouncementsController.register(request, { params });
};
