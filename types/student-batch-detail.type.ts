import type { BatchStatus } from "@/types/batch.type";

export type BatchRosterModule = {
  code: string;
  title: string;
};

/** One roster entry, as built by the get_batch_students RPC. */
export type BatchRosterStudent = {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string | null;
  student_enrollments: Array<{ modules: BatchRosterModule }>;
};

/** Response from GET /api/student/batches/[id]. */
export type StudentBatchDetail = {
  id: string;
  batch_name: string;
  created_at: string;
  status: BatchStatus | null;
  levels: string[];
  students: BatchRosterStudent[] | null;
};