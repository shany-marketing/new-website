import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

// PATCH — resolve or edit feedback
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string; feedbackId: string }> }
) {
  const { hotelId, reviewId, feedbackId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const existing = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM response_feedback WHERE id = $1 AND review_id = $2 AND hotel_id = $3`,
    [feedbackId, reviewId, hotelId]
  );
  if (!existing) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  const body = await req.json();
  const updates: string[] = [];
  const values: unknown[] = [];
  let idx = 0;

  if (typeof body.resolved === "boolean") {
    idx++;
    updates.push(`resolved = $${idx}`);
    values.push(body.resolved);
  }

  if (typeof body.comment === "string") {
    const session = authResult.session;
    if (existing.user_id !== session.user.id && session.user.role !== "admin") {
      return NextResponse.json({ error: "Only the author or admin can edit" }, { status: 403 });
    }
    idx++;
    updates.push(`comment = $${idx}`);
    values.push(body.comment.trim());
  }

  if (updates.length === 0) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  idx++;
  const rows = await query(
    `UPDATE response_feedback SET ${updates.join(", ")} WHERE id = $${idx}
     RETURNING id, user_id, user_name, comment, selected_text, start_offset, end_offset, parent_id, resolved, created_at::text`,
    [...values, feedbackId]
  );

  return NextResponse.json({ feedback: rows[0] });
}

// DELETE — delete own feedback
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string; feedbackId: string }> }
) {
  const { hotelId, reviewId, feedbackId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const existing = await queryOne<{ user_id: string }>(
    `SELECT user_id FROM response_feedback WHERE id = $1 AND review_id = $2 AND hotel_id = $3`,
    [feedbackId, reviewId, hotelId]
  );
  if (!existing) {
    return NextResponse.json({ error: "Feedback not found" }, { status: 404 });
  }

  const session = authResult.session;
  if (existing.user_id !== session.user.id && session.user.role !== "admin") {
    return NextResponse.json({ error: "Only the author or admin can delete" }, { status: 403 });
  }

  await query(`DELETE FROM response_feedback WHERE id = $1`, [feedbackId]);
  return NextResponse.json({ ok: true });
}
