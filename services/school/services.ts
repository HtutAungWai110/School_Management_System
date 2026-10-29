import { createClient } from "@/lib/supabase/server.client";
import { toLocalDateString } from "../attendances/services";
import type {
  MonthlyAttendanceDay,
  MonthlyAttendanceReport,
} from "@/types/school.type";

type AttendanceRecord = {
  date: string | null;
  student_attendances: Array<{ status: string }> | null;
};

type AttendanceBucket = {
  sessionCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
};

/** Monday first: a school week reads left-to-right as it is lived. */
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

function percentage(count: number, total: number) {
  if (total <= 0) return 0;
  return Math.round((count / total) * 1000) / 10;
}

function monthKeyOf(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export class SchoolService {
  static async overview() {
    const supabase = await createClient();

    const [studentQuery, teacherQuery] = await Promise.all([
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "student"),
      supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("role", "teacher"),
    ]);

    if (studentQuery.error || teacherQuery.error) {
      throw new Error("Failed to fetch counts");
    }

    return {
      studentCount: studentQuery.count,
      teacherCount: teacherQuery.count,
    };
  }

  /**
   * Attendance for one month, grouped by weekday.
   *
   * `date` is any calendar day inside the requested month; omitting it resolves
   * to the month of the latest recorded session, which is what makes the first
   * page load land on useful data instead of an empty current month.
   *
   * The response carries the resolved month and the global earliest/latest
   * months, so the client can label its heading and stop paging at the edges
   * without a second request.
   */
  static async getMonthlyAttendances(
    date: string | null
  ): Promise<MonthlyAttendanceReport> {
    const supabase = await createClient();

    const [minDateQuery, maxDateQuery] = await Promise.all([
      supabase
        .from("attendances")
        .select("date")
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("attendances")
        .select("date")
        .order("date", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    if (minDateQuery.error) {
      throw new Error(minDateQuery.error.message);
    }
    if (maxDateQuery.error) {
      throw new Error(maxDateQuery.error.message);
    }

    const earliestMonth = minDateQuery.data?.date
      ? String(minDateQuery.data.date).slice(0, 7)
      : null;
    const latestMonth = maxDateQuery.data?.date
      ? String(maxDateQuery.data.date).slice(0, 7)
      : null;

    /* Parse as local midnight. `new Date("2026-10-01")` is UTC, which lands in
       September west of Greenwich and would shift the whole report one month. */
    const anchor = date
      ? new Date(`${date}T00:00:00`)
      : latestMonth
        ? new Date(`${latestMonth}-01T00:00:00`)
        : new Date();

    const startOfMonth = new Date(
      anchor.getFullYear(),
      anchor.getMonth(),
      1
    );
    const endOfMonth = new Date(
      anchor.getFullYear(),
      anchor.getMonth() + 1,
      0
    );
    const month = monthKeyOf(anchor);

    const { data, error } = await supabase
      .from("attendances")
      .select(`
        date,
        student_attendances(
          status
        )
        `)
      .lte("date", toLocalDateString(endOfMonth))
      .gte("date", toLocalDateString(startOfMonth));

    if (error) {
      throw new Error(error.message);
    }

    const buckets = new Map<number, AttendanceBucket>();

    for (const record of (data ?? []) as AttendanceRecord[]) {
      if (!record.date) continue;

      const dayOfWeek = new Date(`${record.date}T00:00:00`).getDay();
      const bucket = buckets.get(dayOfWeek) ?? {
        sessionCount: 0,
        presentCount: 0,
        absentCount: 0,
        lateCount: 0,
      };

      bucket.sessionCount += 1;

      for (const entry of record.student_attendances ?? []) {
        if (entry.status === "present") bucket.presentCount += 1;
        else if (entry.status === "absent") bucket.absentCount += 1;
        else if (entry.status === "late") bucket.lateCount += 1;
      }

      buckets.set(dayOfWeek, bucket);
    }

    const days: MonthlyAttendanceDay[] = DAY_ORDER.flatMap((dayOfWeek) => {
      const bucket = buckets.get(dayOfWeek);
      if (!bucket) return [];

      const totalCount =
        bucket.presentCount + bucket.absentCount + bucket.lateCount;

      /* A session with no marked students is a gap in the register, not a
         0%-attendance day, so it is omitted rather than plotted as a dip. */
      if (totalCount === 0) return [];

      return [
        {
          dayOfWeek,
          sessionCount: bucket.sessionCount,
          presentCount: bucket.presentCount,
          absentCount: bucket.absentCount,
          lateCount: bucket.lateCount,
          totalCount,
          presentPercentage: percentage(bucket.presentCount, totalCount),
          absentPercentage: percentage(bucket.absentCount, totalCount),
          latePercentage: percentage(bucket.lateCount, totalCount),
        },
      ];
    });

    const totals = days.reduce(
      (accumulator, day) => ({
        sessionCount: accumulator.sessionCount + day.sessionCount,
        presentCount: accumulator.presentCount + day.presentCount,
        absentCount: accumulator.absentCount + day.absentCount,
        lateCount: accumulator.lateCount + day.lateCount,
      }),
      { sessionCount: 0, presentCount: 0, absentCount: 0, lateCount: 0 }
    );

    const totalCount =
      totals.presentCount + totals.absentCount + totals.lateCount;

    return {
      month,
      days,
      totals: {
        ...totals,
        totalCount,
        presentPercentage: percentage(totals.presentCount, totalCount),
        absentPercentage: percentage(totals.absentCount, totalCount),
        latePercentage: percentage(totals.lateCount, totalCount),
      },
      averageAttendancePercentage: percentage(totals.presentCount, totalCount),
      earliestMonth,
      latestMonth,
    };
  }
}
