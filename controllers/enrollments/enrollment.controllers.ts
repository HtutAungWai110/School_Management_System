import { NextRequest, NextResponse } from "next/server";
import { EnrollmentsService } from "@/services/enrollments/services";
import { handleError } from "@/lib/errors/error.handler";

export class EnrollmentController {
  static async list(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
    const search = params.get("search") ?? "";
    const filter = params.get("filter") ?? "";

    try {
      const result = await EnrollmentsService.list(search, filter, page);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async removeMany(request: NextRequest) {
    const body = await request.json().catch(() => ({ student_ids: undefined }));
    const { student_ids } = body;

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: "At least one student is required" }, { status: 400 });
    }

    try {
      const result = await EnrollmentsService.removeManyEnrollments(student_ids);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async remove(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const result = await EnrollmentsService.removeEnrollments(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }

  static async assignBatch(request: NextRequest) {
    const body = await request
      .json()
      .catch(() => ({ batch_id: undefined, student_ids: undefined }));
    const { batch_id, student_ids } = body;

    if (!batch_id || typeof batch_id !== "string") {
      return NextResponse.json({ error: "Batch is required" }, { status: 400 });
    }

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: "At least one student is required" }, { status: 400 });
    }

    try {
      const result = await EnrollmentsService.assignBatch(batch_id, student_ids);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }

  static async assignToBatch(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const { batch_id } = await request.json().catch(() => ({ batch_id: undefined }));

    if (!batch_id || typeof batch_id !== "string") {
      return NextResponse.json({ error: "Batch is required" }, { status: 400 });
    }

    try {
      const result = await EnrollmentsService.assignToBatch(id, batch_id);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }
}
