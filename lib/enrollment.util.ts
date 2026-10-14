import type { EnrollmentStatus } from "@/types/enrollment.type";
import type { EnrollmentLevelRef, EnrollmentModuleRef, StudentEnrollmentRow } from "@/types/student-enrollment.type";
import { parseLevel } from "@/components/levels/level-utils";

export type StudentEnrollment = {
  id: string;
  enrolledAt: string;
  status: EnrollmentStatus;
  module: EnrollmentModuleRef | null;
  level: EnrollmentLevelRef | null;
};

export type EnrollmentLevelGroup = {
  /** Level id, or a sentinel for rows whose level relation came back empty. */
  id: string;
  description: string;
  /** Digits pulled out of the description, e.g. "5" for "LEVEL 5". */
  number: string | null;
  enrollments: StudentEnrollment[];
};

const NO_LEVEL_ID = "no-level";

/** `level_id` and `module_id` are to-one relations, but the untyped client
 *  reports them as arrays, so both shapes are flattened here once instead of
 *  being cast past. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export function normaliseEnrollments(rows: StudentEnrollmentRow[]): StudentEnrollment[] {
  return rows.map((row) => ({
    id: row.id,
    enrolledAt: row.enrolled_at,
    status: row.status,
    module: one(row.modules),
    level: one(row.levels),
  }));
}

export function groupEnrollmentsByLevel(enrollments: StudentEnrollment[]): EnrollmentLevelGroup[] {
  const groups = new Map<string, EnrollmentLevelGroup>();

  for (const enrollment of enrollments) {
    const description = enrollment.level?.description ?? "No level recorded";
    const { number } = parseLevel(description);
    const id = enrollment.level?.id ?? NO_LEVEL_ID;

    const existing = groups.get(id);
    if (existing) existing.enrollments.push(enrollment);
    else groups.set(id, { id, description, number, enrollments: [enrollment] });
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      enrollments: [...group.enrollments].sort((a, b) =>
        (a.module?.code ?? "").localeCompare(b.module?.code ?? "")
      ),
    }))
    /* Foundation first, then Year 1, Year 2 — the order LEVEL_LABELS implies.
       Rows without a recognisable level sink to the end rather than sorting
       as "NaN". */
    .sort((a, b) => {
      if (a.number === null && b.number === null) return a.description.localeCompare(b.description);
      if (a.number === null) return 1;
      if (b.number === null) return -1;
      return Number(a.number) - Number(b.number);
    });
}
