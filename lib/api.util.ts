import { NextRequest, NextResponse } from "next/server";

/** Every id in this schema is a uuid (profiles.id mirrors auth.users.id,
 *  timetables.id and student_enrollments.id are generated defaults). */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Reads the optional `?id=` lookup used by the admin list endpoints.
 *
 * A malformed id is rejected up front instead of being handed to Postgres,
 * where it raises `invalid input syntax for type uuid` and surfaces as a 500.
 * Ignoring it silently would be worse still: the caller would get the whole
 * unfiltered list back and could mistake it for a match.
 */
export function readIdParam(request: NextRequest): { id: string | undefined; error: NextResponse | null } {
  const raw = request.nextUrl.searchParams.get("id")?.trim();

  if (!raw) return { id: undefined, error: null };

  if (!UUID.test(raw)) {
    return {
      id: undefined,
      error: NextResponse.json({ error: "The id parameter must be a valid uuid" }, { status: 400 }),
    };
  }

  return { id: raw, error: null };
}