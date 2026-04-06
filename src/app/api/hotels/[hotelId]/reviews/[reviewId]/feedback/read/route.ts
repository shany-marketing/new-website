import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

// POST — mark feedback as read for current user
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string }> }
) {
  const { hotelId, reviewId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const userId = authResult.session.user.id;

  await query(
    `INSERT INTO feedback_read_status (user_id, review_id, last_read_at)
     VALUES ($1, $2, now())
     ON CONFLICT (user_id, review_id) DO UPDATE SET last_read_at = now()`,
    [userId, reviewId]
  );

  return NextResponse.json({ ok: true });
}
