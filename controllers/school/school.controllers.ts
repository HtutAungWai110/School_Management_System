import { NextRequest, NextResponse } from "next/server";
import { SchoolService } from "@/services/school/services";
import { handleError } from "@/lib/errors/error.handler";
import { readMonthParam } from "@/lib/api.util";

export class SchoolController {
  static async overview() {
    try {
      const data = await SchoolService.overview();
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getMonthlyAttendances(request: NextRequest) {
    /* The chart sends `YYYY-MM-01`; `readMonthParam` also accepts a full day
       and rejects impossible dates instead of letting Postgres match nothing. */
    const { date, error } = readMonthParam(request);
    if (error) return error;

    try {
      const report = await SchoolService.getMonthlyAttendances(date ?? null);
      return NextResponse.json(report);
    } catch (error) {
      return handleError(error);
    }
  }
}

