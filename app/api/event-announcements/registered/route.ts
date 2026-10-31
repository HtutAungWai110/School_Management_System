import { NextRequest } from "next/server";

import { EventAnnouncementsController } from "@/controllers/events/event.controllers";

/**
 * `?page=1&limit=10` — the signed-in student's or teacher's own registrations,
 * newest first. Sits beside `[id]` on purpose: an id is a uuid, so a static
 * segment can never shadow an event.
 */
export const GET = (request: NextRequest) => {
  return EventAnnouncementsController.listRegistered(request);
};
