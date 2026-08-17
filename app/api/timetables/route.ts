import { NextRequest } from "next/server";
import { TimetableController } from "@/controllers/timetables/timetable.controllers";

export async function GET(request: NextRequest) {
  return TimetableController.list(request);
}

export async function POST(request: NextRequest) {
  return TimetableController.create(request);
}
