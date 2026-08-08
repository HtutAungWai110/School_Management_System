import type { Level } from "@/types/module.type";
import type { Profile } from "@/types/profile.type";
import type { EnrollmentModule } from "@/types/enrollment.type";

export type BatchLevel = {
  id: string;
  level_id: string;
  batch_id: string;
  levels: Level;
};

export type BatchAssignmentProfile = Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> & {
  student_enrollments?: {
    modules: EnrollmentModule | null;
  }[];
};

export type BatchAssignment = {
  id: string;
  bacth_id: string;
  student_id: string;
  assigned_at: string;
  profiles: BatchAssignmentProfile | null;
};

export type Batch = {
  id: string;
  batch_name: string;
  created_at: string;
  batch_level: BatchLevel[];
  batch_assignments: BatchAssignment[];
};
