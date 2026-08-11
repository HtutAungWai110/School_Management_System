import { NextRequest, NextResponse } from "next/server";
import { BatchesService } from "@/services/batches/services";
import { handleError } from "@/lib/errors/error.handler";

export class BatchController {
  static async list(request: NextRequest) {
    const search = request.nextUrl.searchParams.get("search") ?? "";

    try {
      const data = await BatchesService.list(search);
      return NextResponse.json(data);
    } catch (error) {
      return handleError(error);
    }
  }

  static async getById(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;

    try {
      const data = await BatchesService.getById(id);
      return NextResponse.json({ data });
    } catch (error) {
      return handleError(error);
    }
  }

  static async create(request: NextRequest) {
    const body = await request.json().catch(() => ({ batch_name: undefined, level_ids: undefined }));
    const { batch_name, level_ids } = body;

    if (!batch_name || typeof batch_name !== "string" || !batch_name.trim()) {
      return NextResponse.json({ error: "Batch name is required" }, { status: 400 });
    }

    if (!Array.isArray(level_ids) || level_ids.length === 0) {
      return NextResponse.json({ error: "At least one level is required" }, { status: 400 });
    }

    try {
      const data = await BatchesService.create(batch_name, level_ids);
      return NextResponse.json({ data }, { status: 201 });
    } catch (error) {
      return handleError(error);
    }
  }

  static async update(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    const { id } = await params;
    const { batch_name } = await request.json().catch(() => ({ batch_name: undefined }));

    if (!batch_name || typeof batch_name !== "string") {
      return NextResponse.json({ error: "Batch name is required" }, { status: 400 });
    }

    try {
      const data = await BatchesService.update(id, batch_name);
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
      const result = await BatchesService.remove(id);
      return NextResponse.json(result);
    } catch (error) {
      return handleError(error);
    }
  }
}
