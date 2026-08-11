import { NextRequest } from "next/server";
import { ModuleLevelController } from "@/controllers/modules_level/module_level.controllers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ModuleLevelController.update(request, { params });
}
