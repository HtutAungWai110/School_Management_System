import { NextRequest, NextResponse } from "next/server";

/** Every id in this schema is a uuid (profiles.id mirrors auth.users.id,
 *  timetables.id and student_enrollments.id are generated defaults). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads one uuid lookup parameter, by name.
 *
 * A malformed id is rejected up front instead of being handed to Postgres,
 * where it raises `invalid input syntax for type uuid` and surfaces as a 500.
 * Ignoring it silently would be worse still: the caller would get the whole
 * unfiltered list back and could mistake it for a match.
 *
 * Named so an endpoint can filter on more than one column — assignments take
 * both an `id` and a `submissionId`, which are different tables and cannot
 * share one parameter.
 */
export function readUuidParam(request: NextRequest, param: string): { value: string | undefined; error: NextResponse | null } {
  const [raw] = request.nextUrl.searchParams.getAll(param);

  const { values, error } = validateIds(
    raw === undefined ? [] : [raw],
    `The ${param} parameter must be a valid uuid`
  );

  return { value: values?.[0], error };
}

/** The `?id=` lookup used by the admin list endpoints. */
export function readIdParam(request: NextRequest): { id: string | undefined; error: NextResponse | null } {
  const { value, error } = readUuidParam(request, "id");
  return { id: value, error };
}

/**
 * Same lookup, but accepting the parameter repeated — `?id=a&id=b`.
 *
 * Needed wherever a single action spans several rows: a timetable swap moves
 * two sessions, and the notification has to point at both of them.
 *
 * Every value is validated; one bad id rejects the whole request rather than
 * being silently dropped, since a partial filter would quietly show the wrong
 * subset.
 */
export function readIdParams(request: NextRequest): { ids: string[] | undefined; error: NextResponse | null } {
  const raw = request.nextUrl.searchParams.getAll("id");

  const { values, error } = validateIds(raw, "Every id parameter must be a valid uuid");
  return { ids: values, error };
}

function validateIds(raw: string[], message: string): { values: string[] | undefined; error: NextResponse | null } {
  const trimmed = raw.map((value) => value.trim()).filter(Boolean);

  if (trimmed.length === 0) return { values: undefined, error: null };

  if (!trimmed.every((value) => UUID.test(value))) {
    return { values: undefined, error: NextResponse.json({ error: message }, { status: 400 }) };
  }

  return { values: trimmed, error: null };
}