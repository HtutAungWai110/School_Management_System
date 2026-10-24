import { NextRequest } from "next/server";

import { EventAnnouncementsController } from "@/controllers/events/event.controllers";

export const GET = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return EventAnnouncementsController.getById(request, { params });
};

/** Edits the post. Author-only; the service re-checks `author_id`. */
export const PATCH = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return EventAnnouncementsController.update(request, { params });
};

/** Removes the row and the images it referenced. */
export const DELETE = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) => {
  return EventAnnouncementsController.remove(request, { params });
};
