import { NextRequest, NextResponse } from "next/server";
import { ProfileService } from "@/services/profile/services";
import { handleError } from "@/lib/errors/error.handler";

export class ProfileController {
  static async update(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const data = await request.json().catch(() => ({}));

    try {
      const result = await ProfileService.update(id, data);
      return NextResponse.json(result);
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
      const result = await ProfileService.remove(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
}
