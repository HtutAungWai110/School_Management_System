import { SchoolController } from "@/controllers/school/school.controllers";

export async function GET() {
  return SchoolController.overview();
}
