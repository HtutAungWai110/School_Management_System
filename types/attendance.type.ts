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

/** Counts for one date a session actually ran.
 *
 *  Student identities are deliberately absent: the staff list only needs
 *  numbers, and the roster is fetched for a single date when it is opened. */
export type AttendanceDayCount = {
  date: string;
  present: number;
  late: number;
  absent: number;
  total: number;
};

/** A timetable row in the staff attendance list, without per-student rows. */
export type AttendanceCalendarSession = Omit<AttendanceSession, "attendances"> & {
  days: AttendanceDayCount[];
};

export type AttendanceCalendarSummaryResponse = {
  finalData: AttendanceCalendarSession[];
  minDate: string | null;
  maxDate: string | null;
  /** Distinct students with at least one mark in the month. */
  studentCount: number;
};

/** One module's present/late/absent roll-up for the month. */
export type ModuleAttendanceStats = {
  moduleId: string;
  code: string;
  title: string;
  sessions: number;
  present: number;
  late: number;
  absent: number;
  total: number;
};

/** One student's attendance rate per module for the month. */
export type StudentModuleRate = {
  studentId: string;
  fullName: string;
  email: string;
  phone: string;
  modules: Array<{
    moduleId: string;
    code: string;
    title: string;
    present: number;
    total: number;
    percentage: number;
  }>;
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
