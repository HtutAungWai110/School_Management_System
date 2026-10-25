import { NextRequest } from "next/server";

import { EventAnnouncementsController } from "@/controllers/events/event.controllers";

/** Whether the signed-in viewer is already registered for the event. */
export const GET = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return EventAnnouncementsController.isRegistered(request, { params });
};
