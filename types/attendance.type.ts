import type { TimetableModule, TimetableStatus, TimetableTeacher } from "@/types/timetable.type";

export type AttendanceStatus = "absent" | "present" | "late";

export type AttendanceClass = {
  id: string;
  class_number: string | null;
};

export type AttendanceBatch = {
  id: string;
  batch_name: string | null;
};

export type AttendanceStudent = {
  id: string;
  attendance_id: string;
  student_id: string;
  status: AttendanceStatus;
  remark: string | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
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
  batches: AttendanceBatch | null;
  attendances: Record<string, AttendanceStudent[]>;
};

export type AttendanceCalendarResponse = {
  finalData: AttendanceSession[];
  minDate: string | null;
  maxDate: string | null;
};

/** One session as it was actually taught: an `attendances` row with its
 *  timetable, and that timetable's batch, classroom and module, populated.
 *
 *  Attendance is the driving table rather than something embedded under each
 *  timetable, so a session that was never taught has no row here instead of
 *  costing a lookup per timetable. */
export type ClassHistoryEntry = {
  id: string;
  date: string;
  timetables: {
    id: string;
    module_id: string;
    batch_id: string;
    class_id: string | null;
    day_of_week: number;
    start_time: string;
    end_time: string;
    status: TimetableStatus | null;
    modules: { id: string; code: string; title: string } | null;
    batches: { id: string; batch_name: string | null } | null;
    classes: { id: string; class_number: string | null } | null;
    profiles: { id: string; full_name: string | null } | null;
  } | null;
};

/** The month actually returned, plus the range the teacher can page between.
 *
 *  The default month is derived rather than echoed, so the caller needs the
 *  answer back to label its navigation - otherwise "previous/next" has no
 *  anchor when the request carried no `date`. */
export type ClassHistoryResponse = {
  finalData: ClassHistoryEntry[];
  minDate: string | null;
  maxDate: string | null;
  month: string | null;
};
