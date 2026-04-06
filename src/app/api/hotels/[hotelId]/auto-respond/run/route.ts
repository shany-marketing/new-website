import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { runAutoRespondNow } from "@/lib/auto-respond";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const result = await runAutoRespondNow(hotelId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Auto-respond run error:", error);
    return NextResponse.json({ error: "Failed to run auto-respond" }, { status: 500 });
  }
}
