import type { TimetableModule, TimetableStatus, TimetableTeacher } from "@/types/timetable.type";

export type AttendanceStatus = "absent" | "present" | "late";

export type AttendanceClass = {
  id: string;
  class_number: string | null;
};

export type AttendanceStudent = {
  id: string;
  status: AttendanceStatus;
  remark: string | null;
  full_name: string | null;
  email: string | null;
};

export type AttendanceSession = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  status: TimetableStatus | null;
  modules: TimetableModule | null;
  profiles: TimetableTeacher | null;
  classes: AttendanceClass | null;
  attendances: Record<string, AttendanceStudent[]>;
};

export type AttendanceCalendarResponse = {
  finalData: AttendanceSession[];
  minDate: string | null;
  maxDate: string | null;
};
