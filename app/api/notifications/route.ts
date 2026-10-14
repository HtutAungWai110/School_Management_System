import { NextRequest } from "next/server";
import { NotificationsController } from "@/controllers/notifications/notifications.controllers";

export async function GET(request: NextRequest) {
  return NotificationsController.list(request);
}

export async function PATCH(request: NextRequest) {
  return NotificationsController.markRead(request);
}