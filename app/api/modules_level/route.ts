import { NextRequest } from "next/server";
import { ModuleController } from "@/controllers/modules/module.controllers";

export async function GET(request: NextRequest) {
  return ModuleController.list(request);
}
