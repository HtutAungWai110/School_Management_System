import { NextRequest } from "next/server";
import { ProfileController } from "@/controllers/profile/profile.controllers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ProfileController.patch(request, { params });
}

/** The complete personal-details set, or a replacement avatar, is sent as one
 *  payload rather than a field patch. It is still restricted to the profile's
 *  editable columns by the service, so a PUT cannot overwrite the role. */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ProfileController.patch(request, { params });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ProfileController.update(request, { params });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  return ProfileController.remove(request, { params });
}
