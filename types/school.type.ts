/** One weekday of an attendance report. Percentages are the share of that
 *  weekday's marked students, so the three values always add up to ~100. */
export type MonthlyAttendanceDay = {
  /** JS `Date#getDay()`: 0 = Sunday … 6 = Saturday. */
  dayOfWeek: number;
  sessionCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalCount: number;
  presentPercentage: number;
  absentPercentage: number;
  latePercentage: number;
};

export type MonthlyAttendanceTotals = {
  sessionCount: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  totalCount: number;
  presentPercentage: number;
  absentPercentage: number;
  latePercentage: number;
};

/**
 * The month actually returned, not necessarily the one requested: a request
 * without `date` resolves to the latest month that has attendance, so the
 * client needs the answer back to label its month navigation.
 *
 * `earliestMonth` / `latestMonth` are global bounds, not the bounds of the
 * returned month, which is what lets the nav know when to stop.
 */
export type MonthlyAttendanceReport = {
  /** `YYYY-MM`. */
  month: string;
  /** Only weekdays with at least one marked student, sorted Monday first. */
  days: MonthlyAttendanceDay[];
  totals: MonthlyAttendanceTotals;
  /** Overall present share for the month, used for the chart's reference line. */
  averageAttendancePercentage: number;
  /** `YYYY-MM`, or null when no attendance has ever been recorded. */
  earliestMonth: string | null;
  latestMonth: string | null;
};
