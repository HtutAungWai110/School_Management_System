import { NextRequest } from "next/server";
import { BatchController } from "@/controllers/batches/batch.controllers";

export async function GET(request: NextRequest) {
  return BatchController.list(request);
}

export async function POST(request: NextRequest) {
  return BatchController.create(request);
}
