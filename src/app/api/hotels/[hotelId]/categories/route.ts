import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const rows = await query<{ id: string; label: string; sentiment: string }>(
      `SELECT id::text, label, sentiment
       FROM consensus_categories
       WHERE hotel_id = $1
       ORDER BY label`,
      [hotelId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Categories GET error:", error);
    return NextResponse.json({ error: "Failed to fetch categories" }, { status: 500 });
  }
}
