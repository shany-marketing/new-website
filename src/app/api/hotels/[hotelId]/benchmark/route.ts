import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { getBenchmarkData } from "@/lib/competitor";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const data = await getBenchmarkData(hotelId);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Benchmark GET error:", error);
    return NextResponse.json({ error: "Failed to fetch benchmark data" }, { status: 500 });
  }
}
