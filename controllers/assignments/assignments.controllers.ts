import { NextRequest, NextResponse } from "next/server";
import { AssignmentsService } from "@/services/assignments/services";
import { handleError } from "@/lib/errors/error.handler";

export class AssignmentController {
  static async list() {
    try {
      const data = await AssignmentsService.list();
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
}
