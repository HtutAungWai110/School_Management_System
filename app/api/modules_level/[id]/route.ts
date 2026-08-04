import { NextRequest, NextResponse } from "next/server";
import { updateModulesLevel } from "@/services/modules_level/services";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const {modules_level} = await request.json();
  try {
    const {deleteResults, updateResults} = await updateModulesLevel(id, modules_level);
    return NextResponse.json({deleteResults, updateResults});
  } catch (error) {
    return NextResponse.json({error: "Failed to update modules level"});
  }
}
