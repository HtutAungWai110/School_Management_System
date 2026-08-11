import { NextRequest, NextResponse } from "next/server";
import { LevelsService } from "@/services/levels/services";
import { handleError } from "@/lib/errors/error.handler";

export class LevelController {
  static async list() {
    try {
      const data = await LevelsService.list();
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async update(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const { description } = await request.json().catch(() => ({ description: undefined }));

    if (!description || typeof description !== "string" || !description.trim()) {
      return NextResponse.json({ error: "Level description is required" }, { status: 400 });
    }

    try {
      const data = await LevelsService.update(id, description);
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
      const result = await LevelsService.remove(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
}
