import { SchoolController } from "@/controllers/school/school.controllers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  return SchoolController.getMonthlyAttendances(request)
}
