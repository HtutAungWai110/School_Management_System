import { NextResponse } from "next/server";
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
}
