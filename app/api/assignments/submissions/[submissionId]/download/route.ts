import { NextRequest } from "next/server";
import { AssignmentController } from "@/controllers/assignments/assignments.controllers";

/** Returns a short-lived signed URL for one submission. The bucket is private,
 *  so this is the only way a client can read an uploaded file. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  return AssignmentController.getSubmissionDownload(request, { params });
}