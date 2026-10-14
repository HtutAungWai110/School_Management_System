import type { Profile } from "@/types/profile.type";

export type EnrollmentLevel = {
  id: string;
  description: string;
};

export type EnrollmentModule = {
  id: string;
  code: string;
  title: string;
};

/** `unassigned` is the default and means an enrolment awaiting admin approval;
 *  `assigned` is set once approved (EnrollmentsService), and is what
 *  BatchesService filters on to find a batch's members. */
export type EnrollmentStatus = "unassigned" | "assigned" | "completed";

export type StudentEnrollment = {
  id: string;
  enrolled_at: string;
  level_id: string;
  status: EnrollmentStatus;
  levels: EnrollmentLevel;
  modules: EnrollmentModule;
};

export type EnrolledStudent = Profile & {
  student_enrollments: StudentEnrollment[];
};

export type EnrollmentsResponse = {
  enrollments: EnrolledStudent[];
  totalCount: number;
  totalEnrollments: number;
  page: number;
  totalPages: number;
};
