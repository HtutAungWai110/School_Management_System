import { NextRequest, NextResponse } from "next/server";
import { BatchesService } from "@/services/batches/services";
import { handleError } from "@/lib/errors/error.handler";

export class BatchController {
  static async list(request: NextRequest) {
    const search = request.nextUrl.searchParams.get("search") ?? "";
    const status = request.nextUrl.searchParams.get("filter") ?? "";

    try {
      const data = await BatchesService.list(search, status);
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
    const body = await request.json().catch(() => ({}));
    const { batch_name, status } = body;

    if (batch_name !== undefined && (typeof batch_name !== "string" || !batch_name.trim())) {
      return NextResponse.json({ error: "Batch name is required" }, { status: 400 });
    }

    if (status !== undefined && status !== "ongoing" && status !== "completed") {
      return NextResponse.json({ error: "Invalid batch status" }, { status: 400 });
    }

    if (batch_name === undefined && status === undefined) {
      return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
    }

    try {
      const data = await BatchesService.update(id, { batch_name, status });
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
