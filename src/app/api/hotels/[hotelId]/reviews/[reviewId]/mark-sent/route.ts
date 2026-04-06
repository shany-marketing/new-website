import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

export async function PUT(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string }> }
) {
  try {
    const { hotelId, reviewId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const result = await query<{ id: string }>(
      `UPDATE raw_reviews
       SET sent_to_booking = TRUE, sent_to_booking_at = NOW()
       WHERE id = $1 AND hotel_id = $2 AND ai_response IS NOT NULL
       RETURNING id`,
      [reviewId, hotelId]
    );

    if (!result.length) {
      return NextResponse.json(
        { error: "Review not found or no response to mark as sent" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Mark sent error:", error);
    return NextResponse.json({ error: "Failed to mark as sent" }, { status: 500 });
  }
}
