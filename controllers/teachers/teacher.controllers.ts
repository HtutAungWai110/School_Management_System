import { NextRequest, NextResponse } from "next/server";
import { TeachersService } from "@/services/teachers/services";
import { handleError } from "@/lib/errors/error.handler";

export class TeacherController {
  static async list(request: NextRequest) {
    const params = request.nextUrl.searchParams;
    const page = Math.max(parseInt(params.get("page") ?? "1", 10) || 1, 1);
    const search = params.get("search") ?? "";
    const filter = params.get("filter") ?? "";

    try {
      const result = await TeachersService.list(search, filter, page);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
}
