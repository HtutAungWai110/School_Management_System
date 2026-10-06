/** Row shape returned by GET /api/assignments (AssignmentsService.list). */
export type StudentAssignment = {
  id: string;
  batch_id: string;
  module_id: string;
  teacher_id: string;
  created_at: string;
  deadline_at: string | null;
  batches: { batch_name: string; status: string } | null;
  modules: { code: string; title: string } | null;
  profiles: { full_name: string; phone: string | null; email: string | null } | null;
};

/** Row returned by GET /api/assignments/student_assignments/[id]. The endpoint
 *  resolves with `null` when the student has not turned anything in. */
export type StudentAssignmentSubmission = {
  id: string;
  assignment_id: string;
  student_id: string;
  turned_in_at: string;
  file_path: string;
  file_name: string;
  profiles: { full_name: string; phone: string | null; email: string | null } | null;
};