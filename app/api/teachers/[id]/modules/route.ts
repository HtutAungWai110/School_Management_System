import { NextRequest } from "next/server";
import { TeacherController } from "@/controllers/teachers/teacher.controllers";

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return TeacherController.updateModules(request, { params });

}
