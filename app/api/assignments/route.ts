import { AssignmentController } from "@/controllers/assignments/assignments.controllers";

export async function GET() {
  return AssignmentController.list();
}