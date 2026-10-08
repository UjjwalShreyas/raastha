import { NextRequest, NextResponse } from "next/server";
import { updateGlobalIssue } from "@/lib/serverStore";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const updates = await req.json();

    const updated = await updateGlobalIssue(id, updates);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: "Issue not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      issue: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update report." },
      { status: 500 }
    );
  }
}
