import type { EnrollmentStatus } from "@/types/enrollment.type";

export type EnrollmentModuleRef = {
  id: string;
  code: string;
  title: string;
};

export type EnrollmentLevelRef = {
  id: string;
  description: string;
};

/** Row returned by GET /api/student/enrollments (StudentsService.getEnrollments).
 *  The embeds are typed as unions because the untyped client reports to-one
 *  relations as arrays; the page normalises them. */
export type StudentEnrollmentRow = {
  id: string;
  enrolled_at: string;
  status: EnrollmentStatus;
  modules: EnrollmentModuleRef | EnrollmentModuleRef[] | null;
  levels: EnrollmentLevelRef | EnrollmentLevelRef[] | null;
};