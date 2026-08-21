import { NextRequest } from "next/server";
import { TimetableController } from "@/controllers/timetables/timetable.controllers";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return TimetableController.getBatchAvailability(_request, { params });
}
