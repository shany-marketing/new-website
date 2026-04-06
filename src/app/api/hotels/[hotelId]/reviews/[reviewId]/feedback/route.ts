import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

// GET — list all feedback for a review
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string }> }
) {
  const { hotelId, reviewId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const rows = await query(
    `SELECT id, user_id, user_name, comment, selected_text,
            start_offset, end_offset, parent_id, resolved,
            created_at::text
     FROM response_feedback
     WHERE review_id = $1 AND hotel_id = $2
     ORDER BY created_at ASC`,
    [reviewId, hotelId]
  );

  return NextResponse.json({ feedback: rows });
}

// POST — create feedback or annotation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string }> }
) {
  const { hotelId, reviewId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const body = await req.json();
  const { comment, selectedText, startOffset, endOffset, parentId } = body;

  if (!comment || typeof comment !== "string" || !comment.trim()) {
    return NextResponse.json({ error: "Comment is required" }, { status: 400 });
  }

  const session = authResult.session;
  const userId = session.user.id;
  const userName = session.user.name || session.user.email;

  // If it's a reply, ignore selection fields
  const isReply = !!parentId;
  const selText = isReply ? null : selectedText || null;
  const selStart = isReply ? null : (typeof startOffset === "number" ? startOffset : null);
  const selEnd = isReply ? null : (typeof endOffset === "number" ? endOffset : null);

  // Validate annotation: if any selection field is set, all must be set
  if (!isReply && selText && (selStart === null || selEnd === null)) {
    return NextResponse.json({ error: "Incomplete annotation: need selectedText, startOffset, and endOffset" }, { status: 400 });
  }

  const rows = await query(
    `INSERT INTO response_feedback (review_id, hotel_id, user_id, user_name, comment, selected_text, start_offset, end_offset, parent_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, user_id, user_name, comment, selected_text, start_offset, end_offset, parent_id, resolved, created_at::text`,
    [reviewId, hotelId, userId, userName, comment.trim(), selText, selStart, selEnd, parentId || null]
  );

  return NextResponse.json({ feedback: rows[0] }, { status: 201 });
}
