import { NextRequest, NextResponse } from "next/server";
import { TimetablesService } from "@/services/timetables/services";
import { handleError } from "@/lib/errors/error.handler";

export class TimetableController {
  static async list(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.get("limit") ?? "10", 10) || 10, 10), 50);
    const batchId = params.get("batch") ?? undefined;

    try {
      const data = await TimetablesService.list(page, limit, batchId);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getClassAvailability(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const data = await TimetablesService.getClassAvailability(id);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async remove(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const result = await TimetablesService.remove(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async update(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { class_id, day_of_week, start_time, end_time } = body;

    if (class_id !== undefined && typeof class_id !== "string") {
      return NextResponse.json({ error: "Invalid class" }, { status: 400 });
    }

    if (day_of_week !== undefined) {
      const day = Number(day_of_week);
      if (!Number.isInteger(day) || day < 1 || day > 7) {
        return NextResponse.json(
          { error: "Day of week must be a number between 1 and 7" },
          { status: 400 }
        );
      }
    }

    if (start_time !== undefined && typeof start_time !== "string") {
      return NextResponse.json({ error: "Invalid start time" }, { status: 400 });
    }

    if (end_time !== undefined && typeof end_time !== "string") {
      return NextResponse.json({ error: "Invalid end time" }, { status: 400 });
    }

    if (class_id === undefined && day_of_week === undefined && start_time === undefined && end_time === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    try {
      const data = await TimetablesService.update(id, {
        class_id,
        day_of_week: day_of_week !== undefined ? Number(day_of_week) : undefined,
        start_time,
        end_time,
      });
      return NextResponse.json({ data });
    } catch (error) {
      return handleError(error);
    }
  }

  static async create(request: NextRequest) {
    const body = await request
      .json()
      .catch(() => ({
        batch_id: undefined,
        module_id: undefined,
        teacher_id: undefined,
        class_id: undefined,
        day_of_week: undefined,
        start_time: undefined,
        end_time: undefined,
      }));

    const { batch_id, module_id, teacher_id, class_id, day_of_week, start_time, end_time } = body;

    const requiredFields: Array<[string, unknown]> = [
      ["batch", batch_id],
      ["module", module_id],
      ["teacher", teacher_id],
      ["class", class_id],
      ["day of week", day_of_week],
      ["start time", start_time],
      ["end time", end_time],
    ];

    for (const [label, value] of requiredFields) {
      if (value === undefined || value === null || value === "") {
        return NextResponse.json({ error: `${label} is required` }, { status: 400 });
      }
    }

    const day = Number(day_of_week);
    if (!Number.isInteger(day) || day < 1 || day > 7) {
      return NextResponse.json(
        { error: "Day of week must be a number between 1 and 7" },
        { status: 400 }
      );
    }

    if (typeof start_time !== "string" || typeof end_time !== "string" || end_time <= start_time) {
      return NextResponse.json({ error: "End time must be after start time" }, { status: 400 });
    }

    try {
      const data = await TimetablesService.create({
        batch_id,
        module_id,
        teacher_id,
        class_id,
        day_of_week: day,
        start_time,
        end_time,
      });
      return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }
}
