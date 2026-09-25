import { NextRequest } from "next/server";
import { TimetableController } from "@/controllers/timetables/timetable.controllers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return TimetableController.swap(request, { params });
}
