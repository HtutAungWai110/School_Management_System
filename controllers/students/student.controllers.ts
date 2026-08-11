import { NextRequest, NextResponse } from "next/server";
import { StudentsService } from "@/services/students/services";
import { handleError } from "@/lib/errors/error.handler";

export class StudentController {
  static async list(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
    const search = params.get("search") ?? "";
    const filter = params.get("filter") ?? "";

    try {
      const result = await StudentsService.list(search, filter, page);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
}
