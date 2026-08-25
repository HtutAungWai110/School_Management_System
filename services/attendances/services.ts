import { createClient } from "@/lib/supabase/server.client";

type AttendanceData = {
  timetable_id: string;
  module_id: string;
  batch_id: string;
};

export class AttendanceService {
  static async create({ timetable_id, module_id, batch_id }: AttendanceData) {
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

    const { data: attendance, error: attendanceInsertError } = await supabase
      .from("attendances")
      .insert({ timetable_id })
      .select("id")
      .single();

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
}
