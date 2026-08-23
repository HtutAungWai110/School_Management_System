import type { Level } from "@/types/module.type";
import type { Profile } from "@/types/profile.type";
import type { EnrollmentModule } from "@/types/enrollment.type";
import type { TimetableStatus } from "@/types/timetable.type";

export type BatchLevel = {
  id: string;
  level_id: string;
  batch_id: string;
  levels: Level;
};

export type BatchAssignmentProfile = Pick<Profile, "id" | "full_name" | "email" | "avatar_url"> & {
  student_enrollments?: {
    id: string;
    level_id: string;
    modules: EnrollmentModule | null;
  }[];
};

export type BatchAssignment = {
  id: string;
  batch_id: string;
  student_id: string;
  assigned_at: string;
  profiles: BatchAssignmentProfile | null;
};

export type BatchTimetable = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  status: TimetableStatus | null;
  modules: { id: string; code: string; title: string } | null;
  profiles: { id: string; full_name: string; email: string; avatar_url: string | null } | null;
  classes: { id: string; class_number: string | null; location: string | null } | null;
};

export type BatchStatus = "ongoing" | "completed";

export type BatchModule = {
  id: string;
  code: string;
  title: string;
};

export type BatchTeacherModule = {
  profiles: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  modules: {
    id: string;
    code: string;
    title: string;
  } | null;
};

export type Batch = {
  id: string;
  batch_name: string;
  created_at: string;
  status: BatchStatus | null;
  batch_level: BatchLevel[];
  batch_assignments: BatchAssignment[];
  timetables?: BatchTimetable[];
};
