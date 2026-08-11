import { NextResponse } from "next/server";
import { SchoolService } from "@/services/school/services";
import { handleError } from "@/lib/errors/error.handler";

export class SchoolController {
  static async overview() {
    try {
      const data = await SchoolService.overview();
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }
}
