import { createClient } from "@/lib/supabase/server.client";

type MonthlyAttendance = {
  month: string;
  classSessions: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  averageAttendancePercentage: number;
};

type AttendanceRecord = {
  date: string;
  student_attendances: Array<{ status: string }>;
};

export class SchoolService {
  static async overview() {
    const supabase = await createClient();

    const [studentQuery, teacherQuery, attendanceQuery] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher"),
      supabase
        .from("attendances")
        .select("date, student_attendances(status)"),
    ]);

    if (studentQuery.error || teacherQuery.error || attendanceQuery.error) {
      throw new Error("Failed to fetch counts");
    }

    const monthly = new Map<
      string,
      {
        classSessions: number;
        presentCount: number;
        absentCount: number;
        lateCount: number;
        sessionPercentages: number[];
      }
    >();

    for (const attendance of (attendanceQuery.data ?? []) as AttendanceRecord[]) {
      const month = attendance.date?.slice(0, 7);
      if (!month) continue;

      const students = attendance.student_attendances ?? [];
      const total = students.length;
      const presentCount = students.filter((s) => s.status === "present").length;
      const absentCount = students.filter((s) => s.status === "absent").length;
      const lateCount = students.filter((s) => s.status === "late").length;

      const entry = monthly.get(month) ?? {
        classSessions: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
        sessionPercentages: [],
      };

      entry.classSessions += 1;
      entry.presentCount += presentCount;
      entry.absentCount += absentCount;
      entry.lateCount += lateCount;
      if (total > 0) entry.sessionPercentages.push((presentCount / total) * 100);
      monthly.set(month, entry);
    }

    const monthlyAttendance: MonthlyAttendance[] = Array.from(monthly.entries())
      .map(([month, entry]) => ({
        month,
        classSessions: entry.classSessions,
        presentCount: entry.presentCount,
        absentCount: entry.absentCount,
        lateCount: entry.lateCount,
        averageAttendancePercentage:
          entry.sessionPercentages.length > 0
            ? Math.round(
                (entry.sessionPercentages.reduce((sum, p) => sum + p, 0) /
                  entry.sessionPercentages.length) * 10
              ) / 10
            : 0,
      }))
      .sort((a, b) => a.month.localeCompare(b.month));

    return {
      studentCount: studentQuery.count,
      teacherCount: teacherQuery.count,
      monthlyAttendance,
    };
  }
}
