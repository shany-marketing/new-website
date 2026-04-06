import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { getAutoRespondLog } from "@/lib/auto-respond";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const limit = parseInt(req.nextUrl.searchParams.get("limit") || "20", 10);
    const log = await getAutoRespondLog(hotelId, Math.min(limit, 100));
    return NextResponse.json(log);
  } catch (error) {
    console.error("Auto-respond log GET error:", error);
    return NextResponse.json({ error: "Failed to fetch log" }, { status: 500 });
  }
}
