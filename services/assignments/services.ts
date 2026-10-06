import { createClient } from "@/lib/supabase/server.client";
import { HttpError } from "@/lib/errors/http.error";
import { ASSIGNMENT_BUCKET, storageKeyFromPublicUrl } from "@/lib/assignment.util";

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

    /* The caller supplies the path because it owns the Storage upload, but it
       must point inside this student's own folder — otherwise a student could
       claim a file belonging to somebody else. */
    if (!payload.file_path.includes(`/${user.id}/`)) {
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
    const storageKey = storageKeyFromPublicUrl(submission.file_path);

    if (storageKey) {
      const { error: storageError } = await supabase.storage
        .from(ASSIGNMENT_BUCKET)
        .remove([storageKey]);

      if (storageError) {
        throw new HttpError(
          500,
          `We couldn't remove the uploaded file, so your submission was left in place: ${storageError.message}`
        );
      }
    }

    const { error } = await supabase
      .from("student_assignments")
      .delete()
      .eq("id", submission.id);

    if (error) throw new Error(error.message);

    return { success: true };
  }
}
