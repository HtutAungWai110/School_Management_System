import { ClassController } from "@/controllers/classes/class.controllers";

export async function GET() {
  return ClassController.list();
}
