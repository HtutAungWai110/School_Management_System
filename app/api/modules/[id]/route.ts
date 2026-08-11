import { NextRequest } from "next/server";
import { ModuleController } from "@/controllers/modules/module.controllers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ModuleController.update(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ModuleController.remove(request, { params });
}
