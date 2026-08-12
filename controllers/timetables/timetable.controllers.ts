import { NextRequest, NextResponse } from "next/server";
import { TimetablesService } from "@/services/timetables/services";
import { handleError } from "@/lib/errors/error.handler";

export class TimetableController {
  static async list() {
    try {
      const data = await TimetablesService.list();
      return NextResponse.json(data);
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
