import { NextRequest, NextResponse } from "next/server";
import { TimetablesService } from "@/services/timetables/services";
import { NotificationsService } from "@/services/notifications/services";
import { createClient } from "@/lib/supabase/server.client";
import { handleError } from "@/lib/errors/error.handler";
import { readIdParams } from "@/lib/api.util";
import type { TimetableSessionRef } from "@/lib/notification.util";
import { TIMETABLE_STATUS_OPTIONS, type TimetableStatus } from "@/types/timetable.type";

type Actor = { id: string; role: string; name: string };

/** Rows as returned by the timetable service, narrowed to what a notification
 *  needs. Kept loose because the embedded relations arrive untyped. */
type Embedded<T> = T | T[] | null;

type SessionRow = {
  id: string;
  teacher_id?: string | null;
  modules?: Embedded<{ code?: string | null }>;
  batches?: Embedded<{ batch_name?: string | null }>;
};

/** The untyped client reports to-one relations as arrays even though they
 *  arrive as objects, so both shapes are flattened here instead of cast past. */
function first<T>(value: Embedded<T> | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

/** Projects one or many timetable rows onto the notification shape. */
function toSessionRefs(payload: SessionRow | SessionRow[] | null | undefined): TimetableSessionRef[] {
  const rows = Array.isArray(payload) ? payload : payload ? [payload] : [];

  return rows
    .filter((row): row is SessionRow => Boolean(row?.id))
    .map((row) => ({
      id: row.id,
      teacherId: row.teacher_id ?? null,
      moduleCode: first(row.modules)?.code ?? null,
      batchName: first(row.batches)?.batch_name ?? null,
    }));
}

const VALID_TIMETABLE_STATUSES = new Set(TIMETABLE_STATUS_OPTIONS.map((option) => option.value));

function parseTimetableStatus(value: unknown): TimetableStatus | null {
  if (typeof value !== "string" || !VALID_TIMETABLE_STATUSES.has(value as TimetableStatus)) {
    return null;
  }
  return value as TimetableStatus;
}

export class TimetableController {
  /** Who is performing the change. Notification routing depends on the role,
   *  and the role lives in profiles rather than the auth token. */
  private static async resolveActor(): Promise<Actor | null> {
    const supabase = await createClient();

    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role, full_name")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) return null;

    return { id: profile.id, role: profile.role, name: profile.full_name };
  }

  /** Announces the change to the other side. Failures are swallowed inside the
   *  service: the timetable write has already landed by this point. */
  private static async announce(
    action: "scheduled" | "updated" | "swapped",
    payload: SessionRow | SessionRow[] | null | undefined
  ) {
    const sessions = toSessionRefs(payload);
    if (sessions.length === 0) return;

    const actor = await TimetableController.resolveActor();
    if (!actor) return;

    await NotificationsService.notifyTimetableChange({
      action,
      actorId: actor.id,
      actorRole: actor.role,
      actorName: actor.name,
      sessions,
    });
  }

  static async list(request: NextRequest) {
    /* Accepts `?id=` repeated, so a swap notification can point at both of the
       sessions it moved. */
    const { ids, error } = readIdParams(request);
    if (error) return error;

    const params = request.nextUrl.searchParams;
    const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.get("limit") ?? "10", 10) || 10, 10), 50);
    const batchId = params.get("batch") ?? undefined;

    try {
      const data = await TimetablesService.list(page, limit, batchId, ids);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getTeacherAvailability(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const data = await TimetablesService.getTeacherAvailability(id);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getBatchAvailability(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const data = await TimetablesService.getBatchAvailability(id);
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
    const { module_id, class_id, day_of_week, start_time, end_time, status } = body;

    if (module_id !== undefined && typeof module_id !== "string") {
      return NextResponse.json({ error: "Invalid module" }, { status: 400 });
    }

    if (status !== undefined && !parseTimetableStatus(status)) {
      return NextResponse.json({ error: "Invalid timetable status" }, { status: 400 });
    }

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

    if (module_id === undefined && class_id === undefined && day_of_week === undefined && start_time === undefined && end_time === undefined && status === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    try {
      const data = await TimetablesService.update(id, {
        module_id,
        class_id,
        day_of_week: day_of_week !== undefined ? Number(day_of_week) : undefined,
        start_time,
        end_time,
        status: status !== undefined ? (status as TimetableStatus) : undefined,
      });
      await TimetableController.announce("updated", data);
      return NextResponse.json({ data });
    } catch (error) {
      return handleError(error);
    }
  }

  static async swap(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const body = await request.json().catch(() => ({ other_id: undefined }));
    const { other_id } = body;

    if (!other_id || typeof other_id !== "string") {
      return NextResponse.json({ error: "other_id is required" }, { status: 400 });
    }

    if (other_id === id) {
      return NextResponse.json({ error: "Choose a different session to swap with" }, { status: 400 });
    }

    try {
      const data = await TimetablesService.swap(id, other_id);
      await TimetableController.announce("swapped", data.sessions);
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

    const { batch_id, module_id, teacher_id, class_id, day_of_week, start_time, end_time, status } = body;

    if (status !== undefined && !parseTimetableStatus(status)) {
      return NextResponse.json({ error: "Invalid timetable status" }, { status: 400 });
    }

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
        status: status !== undefined ? (status as TimetableStatus) : "ongoing",
      });
      await TimetableController.announce("scheduled", data);
      return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }
}
