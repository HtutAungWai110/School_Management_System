import { NextRequest, NextResponse } from "next/server";
import { AssignmentsService } from "@/services/assignments/services";
import { handleError } from "@/lib/errors/error.handler";
import { readIdParam, readUuidParam } from "@/lib/api.util";

export class AssignmentController {
  static async list(request: NextRequest) {
    /* `id` is the assignment; `submissionId` is one of its
       student_assignments rows. Distinct names because they address different
       tables and cannot share one parameter. */
    const { id, error: idError } = readIdParam(request);
    if (idError) return idError;

    const { value: submissionId, error: submissionError } = readUuidParam(request, "submissionId");
    if (submissionError) return submissionError;

    const params = request.nextUrl.searchParams;
    const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
    const limit = Math.min(Math.max(parseInt(params.get("limit") ?? "10", 10) || 10, 10), 50);

    try {
      const data = await AssignmentsService.list(page, limit, id, submissionId);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }


  static async getTurnedInAssignments(request: NextRequest, { params } : { params: Promise<{ id: string }> }) {
    const { id } = await params;
    try {
      const data = await AssignmentsService.getTurnedInAssignments(id);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }

  }

  static async submit(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { file_path, file_name } = await request.json().catch(() => ({}));

    const requiredFields: Array<[string, unknown]> = [
      ["file path", file_path],
      ["file name", file_name],
    ];

    for (const [label, value] of requiredFields) {
      if (value === undefined || value === null || value === "") {
        return NextResponse.json({ error: `${label} is required` }, { status: 400 });
      }
    }

    try {
      const data = await AssignmentsService.submit(id, { file_path, file_name });
      return NextResponse.json(data, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }

  static async remove(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    try {
      const data = await AssignmentsService.remove(id);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getSubmissionDownload(request: NextRequest, { params }: { params: Promise<{ submissionId: string }> }) {
    const { submissionId } = await params;

    try {
      const data = await AssignmentsService.getSubmissionDownloadUrl(submissionId);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }
}
