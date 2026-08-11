import { NextRequest } from "next/server";
import { BatchController } from "@/controllers/batches/batch.controllers";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return BatchController.getById(request, { params });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return BatchController.update(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return BatchController.remove(request, { params });
}
