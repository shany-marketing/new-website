import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string }> }
) {
  try {
    const { hotelId, reviewId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const body = await req.json();
    const { responseText } = body;

    if (!responseText || responseText.trim().length === 0) {
      return NextResponse.json({ error: "Response text is required" }, { status: 400 });
    }

    const review = await queryOne<{ id: string }>(
      "SELECT id FROM raw_reviews WHERE id = $1 AND hotel_id = $2",
      [reviewId, hotelId]
    );

    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }

    await query(
      `UPDATE raw_reviews SET ai_response = $1, ai_response_edited = TRUE WHERE id = $2`,
      [responseText.trim(), reviewId]
    );

    return NextResponse.json({ responseText: responseText.trim() });
  } catch (error) {
    console.error("Edit response error:", error);
    return NextResponse.json({ error: "Failed to update response" }, { status: 500 });
  }
}
