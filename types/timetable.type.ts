import type { Class } from "@/types/class.type";

export type TimetableBatch = { id: string; batch_name: string };
export type TimetableModule = { id: string; code: string; title: string };
export type TimetableTeacher = { id: string; full_name: string };
export type TimetableClass = Class;

export type Timetable = {
  id: string;
  batch_id: string;
  module_id: string;
  teacher_id: string;
  class_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
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
