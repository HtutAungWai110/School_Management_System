import { BatchController } from "@/controllers/batches/batch.controllers";
import { NextRequest } from "next/server";

export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return BatchController.getBatchModules(request, { params });
};
