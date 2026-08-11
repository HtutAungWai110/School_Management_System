import { ModulesLevelService } from "@/services/modules_level/services";
import { NextRequest, NextResponse } from "next/server";
import { handleError } from "@/lib/errors/error.handler";

export class ModuleLevelController {
  static async update(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const body = await request.json();

    if (!body || !Array.isArray(body.modules_level)) {
      return NextResponse.json(
        { error: "Payload must be an object with a 'modules_level' array." },
        { status: 400 }
      );
    }

    const payload = body.modules_level as Array<{ level_id: string; required: string }>;

    try {
      const { deleteResults, updateResults } = await ModulesLevelService.updateModulesLevel(id, payload);
      return NextResponse.json({ deleteResults, updateResults });
    } catch (error) {
      return handleError(error);
    }
  }
}
