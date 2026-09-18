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

  static async updateModules(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const body = await request.json();

    const { modules } = body as { modules: Array<string> };
    try {
      const { addResults, deleteResults } = await TeachersService.updateModules(id, modules);
      return NextResponse.json({ addResults, deleteResults });
    } catch (error) {
      return handleError(error);
    }
  }

  static async getOverview(_request: NextRequest) {

    try {
      const {totalSessions, timetableSessions, totalUniqueStudents} = await TeachersService.getOverview();
      return NextResponse.json({totalSessions, timetableSessions, totalUniqueStudents})
    } catch (error) {
      return handleError(error);
    }
  }

  static async getTimetableSessions(_request: NextRequest) {
    try {
      const timetableSessions = await TeachersService.getTimetableSessions();
      return NextResponse.json(timetableSessions);
    } catch (error) {
      return handleError(error);
    }
  }
}
