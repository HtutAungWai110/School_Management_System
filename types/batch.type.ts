import type { Level } from "@/types/module.type";
import type { Profile } from "@/types/profile.type";

export type BatchLevel = {
  id: string;
  level_id: string;
  batch_level: string;
  levels: Level;
};

export type BatchAssignment = {
  id: string;
  bacth_id: string;
  student_id: string;
  assigned_at: string;
  profiles: Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> | null;
};

export type Batch = {
  id: string;
  batch_name: string;
  created_at: string;
  batch_level: BatchLevel[];
  batch_assignments: BatchAssignment[];
};
