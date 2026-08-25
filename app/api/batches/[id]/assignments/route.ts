import { BatchController } from "@/controllers/batches/batch.controllers";
import { NextRequest } from "next/server";

export const DELETE = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return BatchController.removeAssignmentsBulk(request, { params });
};
