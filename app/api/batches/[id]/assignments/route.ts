import { BatchController } from "@/controllers/batches/batch.controllers";
import { NextRequest } from "next/server";

export const GET = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return BatchController.getAssignments(request, { params });
};

export const POST = async (request: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  return BatchController.createAssignment(request, { params });
};