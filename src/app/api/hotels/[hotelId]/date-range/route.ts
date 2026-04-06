import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const row = await queryOne<{ earliest: string | null; latest: string | null }>(
      `SELECT
         TO_CHAR(MIN(review_date), 'YYYY-MM') AS earliest,
         TO_CHAR(MAX(review_date), 'YYYY-MM') AS latest
       FROM raw_reviews
       WHERE hotel_id = $1 AND review_date IS NOT NULL`,
      [hotelId]
    );

    return NextResponse.json({
      earliest: row?.earliest ?? null,
      latest: row?.latest ?? null,
    });
  } catch (error) {
    console.error("Date range GET error:", error);
    return NextResponse.json({ error: "Failed to fetch date range" }, { status: 500 });
  }
}
