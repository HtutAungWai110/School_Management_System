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
      .catch(() => ({ batch_id: undefined, student_ids: undefined, student_module_map: undefined }));
    const { batch_id, student_ids, student_module_map } = body;

    if (!batch_id || typeof batch_id !== "string") {
      return NextResponse.json({ error: "Batch is required" }, { status: 400 });
    }

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ error: "At least one student is required" }, { status: 400 });
    }

    if (!student_module_map || typeof student_module_map !== "object") {
      return NextResponse.json({ error: "student_module_map is required" }, { status: 400 });
    }

    const studentModuleMap = new Map<string, string[]>()
    for (const studentId of student_ids) {
      const moduleIds = student_module_map[studentId]
      if (Array.isArray(moduleIds)) {
        studentModuleMap.set(studentId, moduleIds)
      }
    }

    try {
      const result = await EnrollmentsService.assignBatch(batch_id, studentModuleMap);
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
    const { batch_id, module_ids } = await request.json().catch(() => ({ batch_id: undefined, module_ids: undefined }));

    if (!batch_id || typeof batch_id !== "string") {
      return NextResponse.json({ error: "Batch is required" }, { status: 400 });
    }

    const moduleIdArray = Array.isArray(module_ids) ? module_ids : [];

    try {
      const result = await EnrollmentsService.assignToBatch(id, batch_id, moduleIdArray);
      return NextResponse.json(result, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }
}
