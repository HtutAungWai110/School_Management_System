import { NextRequest } from "next/server";
import { BatchController } from "@/controllers/batches/batch.controllers";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; assignmentId: string }> }
) {
  return BatchController.removeAssignment(request, { params });
}
