import type { Class } from "@/types/class.type";

export type TimetableBatch = { id: string; batch_name: string };
export type TimetableModule = { id: string; code: string; title: string };
export type TimetableTeacher = { id: string; full_name: string };
export type TimetableClass = Class;

export type TimetableStatus = "ongoing" | "on break" | "completed";

export const TIMETABLE_STATUS_OPTIONS: Array<{ value: TimetableStatus; label: string }> = [
  { value: "ongoing", label: "Ongoing" },
  { value: "on break", label: "On break" },
  { value: "completed", label: "Completed" },
];

export const TIMETABLE_STATUS_LABELS: Record<TimetableStatus, string> = {
  "ongoing": "Ongoing",
  "on break": "On break",
  "completed": "Completed",
};

export type Timetable = {
  id: string;
  batch_id: string;
  module_id: string;
  teacher_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  status: TimetableStatus | null;
  batches: TimetableBatch | null;
  modules: TimetableModule | null;
  profiles: TimetableTeacher | null;
  classes: TimetableClass | null;
};

export type ClassAvailabilitySlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  modules: TimetableModule | null;
  batches: TimetableBatch | null;
  profiles: TimetableTeacher | null;
};

export type TeacherAvailabilitySlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  modules: TimetableModule | null;
  batches: TimetableBatch | null;
  classes: { id: string; class_number: string | null; location: string | null } | null;
};

export type BatchAvailabilitySlot = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  modules: TimetableModule | null;
  profiles: TimetableTeacher | null;
  classes: { id: string; class_number: string | null; location: string | null } | null;
};

export const DAY_OF_WEEK_LABELS: Record<number, string> = {
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
  7: "Sunday",
};

export const DAY_OF_WEEK_OPTIONS = Object.entries(DAY_OF_WEEK_LABELS).map(
  ([value, label]) => ({ value, label })
);
