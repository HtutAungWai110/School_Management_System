import { createClient } from "@/lib/supabase/server.client";
import type { AttendanceCalendarResponse, AttendanceSession } from "@/types/attendance.type";

const ATTENDANCE_SELECT = `
  id,
  modules(
    id,
    title,
    code
  ),
  profiles(
    id,
    full_name,
    email
  ),
  classes(
    id,
    class_number
  ),
  day_of_week,
  start_time,
  end_time,
  status,
  attendances!inner (
    id,
    date,
    student_attendances(
      id,
      attendance_id,
      student_id,
      status,
      remark,
      profiles(
        id,
        full_name,
        email
      )
    )
  )
  `

type AttendanceData = {
  timetable_id: string;
  module_id: string;
  batch_id: string;
  date: string | null;
};

type RawStudentAttendance = {
  id: string;
  attendance_id: string;
  student_id: string;
  status: AttendanceSession["attendances"][string][number]["status"];
  remark: string | null;
  profiles: { full_name: string; email: string } | null;
};

type RawAttendance = {
  date: string;
  student_attendances: RawStudentAttendance[];
};

function mapAttendance(
  item: Omit<AttendanceSession, "attendances"> & { attendances: RawAttendance[] }
): AttendanceSession {
  const attendances: AttendanceSession["attendances"] = {};
  item.attendances.forEach((attendanceItem) => {
    if (!attendances[attendanceItem.date]) {
      attendances[attendanceItem.date] = attendanceItem.student_attendances.map((student) => {
        const { profiles, ...rest } = student
        return {
          ...rest,
          full_name: profiles?.full_name ?? null,
          email: profiles?.email ?? null,
        }
      })
    }
  })
  return {
    ...item,
    attendances,
  };
}

function buildFinalData(
  attendanceData: Array<
    Omit<AttendanceSession, "attendances"> & { attendances: RawAttendance[] }
  >
): AttendanceSession[] {
  return attendanceData.map(mapAttendance);
}

export class AttendanceService {
  static async create({ timetable_id, module_id, batch_id, date = null }: AttendanceData) {
    const supabase = await createClient();

    const { data: timetableData, error: timetableDataError } = await supabase
      .from("timetables")
      .select("id")
      .eq("id", timetable_id)
      .eq("module_id", module_id)
      .eq("batch_id", batch_id)
      .single();

    if (timetableDataError) throw timetableDataError;
    if (!timetableData) throw new Error("Timetable not found");

    const { data: batchStudentsData, error: batchStudentsError } = await supabase
      .from("batch_assignments")
      .select("profiles(id)")
      .eq("batch_id", batch_id);

    if (batchStudentsError) throw batchStudentsError;

    const studentIds = batchStudentsData
      .map((item) => (item.profiles as unknown as { id: string } | null)?.id)
      .filter((id): id is string => Boolean(id));

    const { data: targetStudentsData, error: targetStudentsError } = await supabase
      .from("student_enrollments")
      .select("student_id")
      .in("student_id", studentIds)
      .eq("module_id", module_id)
      .eq("status", "assigned");

    if (targetStudentsError) throw targetStudentsError;

    const studentFlatIds = targetStudentsData.map((item) => item.student_id);

    const query =  supabase
      .from("attendances")
      .insert({ timetable_id, date : date ?? new Date().toISOString() })
      .select("id")
      .single();

    const { data: attendance, error: attendanceInsertError } = await query;

    if (attendanceInsertError) {
      if (attendanceInsertError.code === "23505") {
        throw new Error(
          "Attendance for this class session already exists today. You can only record attendance once per session per day."
        );
      }
      throw attendanceInsertError;
    }

    if (studentFlatIds.length > 0) {
      const studentAttendanceRows = studentFlatIds.map((student_id) => ({
        attendance_id: attendance.id,
        student_id,
        status: "absent" as const,
      }));

      const { error: studentAttendanceError } = await supabase
        .from("student_attendances")
        .insert(studentAttendanceRows);

      if (studentAttendanceError) throw studentAttendanceError;
    }

    return {
      attendance_id: attendance.id,
      enrolled_students: studentFlatIds.length,
    };
  }

  static async getAttendances(batchId: string, date: string | null): Promise<AttendanceCalendarResponse> {
    const supabase = await createClient();

    const query = supabase
      .from("timetables")
      .select(ATTENDANCE_SELECT)
      .eq('batch_id', batchId)

    const { data: timetablIds, error: timetableError } = await supabase
      .from("timetables")
      .select("id")
      .eq('batch_id', batchId)

    if (timetableError) {
      throw timetableError;
    }

    const timetableIds = timetablIds.map((item) => item.id);

    const { data: minDateRow } = await supabase
      .from("attendances")
      .select("date")
      .in("timetable_id", timetableIds)
      .order("date", {ascending: true})
      .limit(1)
      .maybeSingle()

    const { data: maxDateRow } = await supabase
      .from("attendances")
      .select("date")
      .in("timetable_id", timetableIds)
      .order("date", {ascending: false})
      .limit(1)
      .maybeSingle()

    if (!minDateRow) {
      return { finalData: [], minDate: null, maxDate: null };
    }

    const baseDate = date ? new Date(date) : new Date(maxDateRow?.date);
    const startOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
    const endOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);
    const startDateStr = startOfMonth.toISOString().split('T')[0];
    const endDateStr = endOfMonth.toISOString().split('T')[0];
    query
      .gte('attendances.date', startDateStr)
      .lte('attendances.date', endDateStr);

    const { data: attendanceData, error: attendanceDataError } = await query;
    if (attendanceDataError) throw new Error(attendanceDataError.message);

    const timetables = attendanceData as unknown as Array<
      Omit<AttendanceSession, "attendances"> & { attendances: RawAttendance[] }
    >;

    const finalData = buildFinalData(timetables);

    return {
      finalData,
      minDate: minDateRow?.date ?? null,
      maxDate: maxDateRow?.date ?? null,
    };
  }

  static async updateAttendance({id, attendanceId, studentId, status, remark = null}: {id: string; attendanceId: string; studentId: string; status: string; remark?: string | null; }) {
    const supabase = await createClient();
    const { data: attendanceExist, error: attendanceExistError } = await supabase
      .from("student_attendances")
      .select("*")
      .eq("id", id)
      .eq("attendance_id", attendanceId)
      .eq("student_id", studentId)
      .single();
    if (attendanceExistError || !attendanceExist) throw new Error("Attendance not found");

    const {data: attendanceUpdate, error: attendanceUpdateError} = await supabase
      .from("student_attendances")
      .update({ status, remark })
      .eq("id", id)
      .eq("attendance_id", attendanceId)
      .eq("student_id", studentId)
      .select()
      .single();
    if (attendanceUpdateError) throw new Error("Failed to update attendance");
    return attendanceUpdate;
  }

  static async getById(id: string) {
    const supabase = await createClient();
    const { data: attendanceData, error: attendanceDataError } = await supabase
      .from("timetables")
      .select(ATTENDANCE_SELECT)
      .eq("attendances.id", id)
      .single();
    if (attendanceDataError) throw new Error(attendanceDataError.message);

    return mapAttendance(
      attendanceData as unknown as Omit<AttendanceSession, "attendances"> & {
        attendances: RawAttendance[]
      }
    );
  }

  static async bulkUpdate(updates: Array<{ id: string; attendanceId: string; studentId: string; status: string; remark?: string | null }>) {
    const results = [];
    for (const update of updates) {
      const result = await this.updateAttendance(update);
      results.push(result);
    }
    return results;
  }
}
