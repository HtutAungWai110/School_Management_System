import { NextRequest } from "next/server";
import { LevelController } from "@/controllers/levels/level.controllers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return LevelController.update(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return LevelController.remove(request, { params });
}
