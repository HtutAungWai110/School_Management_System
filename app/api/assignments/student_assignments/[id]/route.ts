import { AssignmentController } from "@/controllers/assignments/assignments.controllers";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return AssignmentController.getTurnedInAssignments(request, {params})
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return AssignmentController.submit(request, { params })
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return AssignmentController.remove(request, { params })
}
