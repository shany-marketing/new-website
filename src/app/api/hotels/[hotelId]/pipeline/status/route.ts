import { NextRequest, NextResponse } from "next/server";
import { getPipelineStatus } from "@/lib/pipeline";
import { requireHotelAccess } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;
    const status = await getPipelineStatus(hotelId);
    if (!status) {
      return NextResponse.json({ status: "none" });
    }
    return NextResponse.json(status);
  } catch (error) {
    console.error("Pipeline status error:", error);
    return NextResponse.json(
      { error: "Failed to get pipeline status" },
      { status: 500 }
    );
  }
}
