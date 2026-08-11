import { NextRequest, NextResponse } from "next/server";
import { ModulesService } from "@/services/modules/services";
import { handleError } from "@/lib/errors/error.handler";

export class ModuleController {
  static async list(request: NextRequest) {
    const search = request.nextUrl.searchParams.get("search") ?? "";

    try {
      const data = await ModulesService.list(search);
      return NextResponse.json(data, { status: 200 });
    } catch (error) {
      return handleError(error);
    }
  }

  static async update(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const { code, title } = await request.json().catch(() => ({ code: undefined, title: undefined }));

    if (typeof code !== "string" || typeof title !== "string") {
      return NextResponse.json({ error: "Code and title are required" }, { status: 400 });
    }

    try {
      const data = await ModulesService.update(id, code, title);
      return NextResponse.json({ data });
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
      const result = await ModulesService.remove(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
}
