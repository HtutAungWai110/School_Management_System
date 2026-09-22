import { BatchController } from "@/controllers/batches/batch.controllers";
import { NextRequest } from "next/server";

export const POST = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return BatchController.createAssignment(request, { params });
};