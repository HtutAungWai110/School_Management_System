import type { BatchStatus } from "@/types/batch.type";

/** Row returned by GET /api/student/batches (StudentsService.getBatches). */
export type StudentBatch = {
  id: string;
  batch_name: string;
  created_at: string;
  status: BatchStatus | null;
  levels: string[];
};