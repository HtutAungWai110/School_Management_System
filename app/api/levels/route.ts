import { LevelController } from "@/controllers/levels/level.controllers";

export async function GET() {
  return LevelController.list();
}
