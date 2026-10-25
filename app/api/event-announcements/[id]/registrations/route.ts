import { NextRequest } from "next/server";

import { EventAnnouncementsController } from "@/controllers/events/event.controllers";

/**
 * One page of the registrations for an event. Admin-only; `limit` is one of
 * 10, 20 or 30, and defaults to 10.
 */
export const GET = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return EventAnnouncementsController.listRegistrations(request, { params });
};
