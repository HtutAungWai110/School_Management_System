import { NextRequest } from "next/server";
import { ProfileController } from "@/controllers/profile/profile.controllers";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ProfileController.update(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ProfileController.remove(request, { params });
}
