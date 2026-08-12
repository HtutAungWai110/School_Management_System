import { NextRequest } from "next/server";
import { TimetableController } from "@/controllers/timetables/timetable.controllers";

export async function GET() {
  return TimetableController.list();
}

export async function POST(request: NextRequest) {
  return TimetableController.create(request);
}
