import { NextRequest } from "next/server";

import { EventAnnouncementsController } from "@/controllers/events/event.controllers";

/** `?page=1&limit=10` — newest first, paginated. */
export const GET = (request: NextRequest) => {
  return EventAnnouncementsController.list(request);
};

/** Publishes an event or a plain announcement. */
export const POST = (request: NextRequest) => {
  return EventAnnouncementsController.create(request);
};
