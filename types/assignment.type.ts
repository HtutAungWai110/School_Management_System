import type { Assignment } from "@/types/batch.type";

/** Envelope returned by the paginated list endpoints. The batch and teacher
 *  assignment endpoints still return a bare `Assignment[]`, which is why
 *  consumers must tolerate both shapes — see `useAssignmentsData`.
 *
 *  Generic because callers narrow the row shape to what they actually consume:
 *  the student page sorts with `sortByUrgency`, which expects `StudentAssignment`. */
export type PaginatedAssignments<T = Assignment> = {
  assignments: T[];
  totalCount: number;
  totalPages: number;
};