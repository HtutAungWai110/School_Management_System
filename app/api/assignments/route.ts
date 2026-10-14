import { NextRequest } from "next/server";
import { AssignmentController } from "@/controllers/assignments/assignments.controllers";

export async function GET(request: NextRequest) {
  return AssignmentController.list(request);
}