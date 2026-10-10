import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";
import { ASSIGNMENT_BUCKET, toStorageKey } from "@/lib/assignment.util";

const ASSIGNMENT_SELECT = `
  *,
  batches(
    batch_name,
    status
  ),
  modules(
    code,
    title
  ),
  profiles(
    full_name,
    phone,
    email
  )
  `;

/** Includes student_assignments, so a panel can list who has turned work in.
 *  Shared with TeachersService.getOwnAssignments, which returns the same shape
 *  scoped to one teacher rather than one batch. */
export const ASSIGNMENT_SUBMISSIONS_SELECT = `
  id,
  batch_id,
  module_id,
  teacher_id,
  created_at,
  deadline_at,
  modules (
    id,
    code,
    title
  ),
  profiles (
    id,
    full_name,
    email,
    phone
  ),
  student_assignments (
    id,
    assignment_id,
    student_id,
    turned_in_at,
    file_path,
    file_name,
    profiles (
      id,
      full_name,
      email,
      phone
    )
  )
  `;

export class AssignmentsService {
  static async list() {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("assignments")
      .select(ASSIGNMENT_SELECT);

    if (error) throw new Error(error.message);

    return data;
  }

  static async getTurnedInAssignments(id: string) {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from("student_assignments")
      .select(`
        *,
        profiles(
          full_name,
          email,
          phone
        )
        `)
      .eq("assignment_id", id)
      .maybeSingle()

    if (error) throw new Error(error.message)

    return data;
  }

  static async submit(
    assignmentId: string,
    payload: { file_path: string; file_name: string }
  ) {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(userError.message);
    }

    const { user } = userData;

    if (!user) throw new HttpError(401, "Authentication required.");

    /* The caller owns the Storage upload, so it supplies the key — but that key
       must stay inside this student's own folder, otherwise a student could
       claim a file belonging to somebody else. Traversal segments are rejected
       outright so a key cannot appear to match while pointing elsewhere. */
    if (
      !payload.file_path.includes(`/${user.id}/`) ||
      payload.file_path.includes("..") ||
      payload.file_path.startsWith("/")
    ) {
      throw new HttpError(400, "File path does not belong to your submission folder.");
    }

    const { data, error } = await supabase
      .from("student_assignments")
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        file_path: payload.file_path,
        file_name: payload.file_name,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    return data;
  }

  static async remove(assignmentId: string) {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(userError.message);
    }

    const { user } = userData;

    if (!user) throw new HttpError(401, "Authentication required.");

    const { data: assignment, error: assignmentError } = await supabase
      .from("assignments")
      .select("id, deadline_at")
      .eq("id", assignmentId)
      .single();

    if (assignmentError) throw new Error(assignmentError.message);
    if (!assignment) throw new HttpError(404, "Assignment not found.");

    /* An assignment with no deadline can be withdrawn at any point. Once one
       is set it stays withdrawable right up to that moment, and not after. */
    if (assignment.deadline_at) {
      const due = new Date(assignment.deadline_at);

      if (!Number.isNaN(due.getTime()) && due.getTime() < Date.now()) {
        throw new HttpError(
          403,
          "The deadline for this assignment has passed, so it can no longer be withdrawn. Contact your teacher if you need it changed."
        );
      }
    }

    const { data: submission, error: submissionError } = await supabase
      .from("student_assignments")
      .select("id, file_path")
      .eq("assignment_id", assignmentId)
      .eq("student_id", user.id)
      .maybeSingle();

    if (submissionError) throw new Error(submissionError.message);
    if (!submission) throw new HttpError(404, "You haven't submitted this assignment.");

    /* The object goes first. If the bucket removal fails the row survives, so a
       submission is never left recorded against a file that is already gone. */
    const storageKey = toStorageKey(submission.file_path);

    const { error: storageError } = await supabase.storage
      .from(ASSIGNMENT_BUCKET)
      .remove([storageKey]);

    if (storageError) {
      throw new HttpError(
        500,
        `We couldn't remove the uploaded file, so your submission was left in place: ${storageError.message}`
      );
    }

    const { error } = await supabase
      .from("student_assignments")
      .delete()
      .eq("id", submission.id);

    if (error) throw new Error(error.message);

    return { success: true };
  }

  /** Mints a short-lived signed URL for one submission.
   *
   *  The bucket is private, so this is the only way to read a file. It is
   *  authorised here rather than trusted from the caller, because knowing a
   *  submission id must not be enough to obtain someone else's work. */
  static async getSubmissionDownloadUrl(submissionId: string) {
    const supabase = await createClient();

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(userError.message);
    }

    const { user } = userData;

    if (!user) throw new HttpError(401, "Authentication required.");

    const { data: submission, error: submissionError } = await supabase
      .from("student_assignments")
      .select("id, student_id, file_path, file_name, assignments ( batch_id )")
      .eq("id", submissionId)
      .maybeSingle();

    if (submissionError) throw new Error(submissionError.message);
    if (!submission) throw new HttpError(404, "Submission not found.");

    if (submission.student_id !== user.id) {
      // The embed resolves to the assignment's batch. It is a to-one relation,
      // but an untyped client types it loosely, so both shapes are tolerated.
      const related = submission.assignments as unknown as
        | { batch_id: string }
        | Array<{ batch_id: string }>
        | null;
      const batchId = Array.isArray(related) ? related[0]?.batch_id : related?.batch_id;

      const { data: caller } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      let permitted = caller?.role === "admin";

      if (!permitted && batchId) {
        const { data: teaching } = await supabase
          .from("timetables")
          .select("id")
          .eq("teacher_id", user.id)
          .eq("batch_id", batchId)
          .limit(1)
          .maybeSingle();

        permitted = Boolean(teaching);
      }

      if (!permitted) {
        throw new HttpError(403, "You do not have access to this submission.");
      }
    }

    const { data: signed, error: signedError } = await supabase.storage
      .from(ASSIGNMENT_BUCKET)
      .createSignedUrl(toStorageKey(submission.file_path), 300);

    if (signedError) throw new Error(signedError.message);
    if (!signed?.signedUrl) throw new HttpError(404, "That file is no longer in storage.");

    return { url: signed.signedUrl, file_name: submission.file_name };
  }
}
