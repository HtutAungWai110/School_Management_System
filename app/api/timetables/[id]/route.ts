import { NextRequest } from "next/server";
import { TimetableController } from "@/controllers/timetables/timetable.controllers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return TimetableController.update(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return TimetableController.remove(request, { params });
}
