import { NextResponse } from "next/server";
import { ClassesService } from "@/services/classes/services";
import { handleError } from "@/lib/errors/error.handler";

export class ClassController {
  static async list() {
    try {
      const data = await ClassesService.list();
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }
}
