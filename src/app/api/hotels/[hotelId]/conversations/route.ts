import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

// GET /api/hotels/:hotelId/conversations — list conversations
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const rows = await query(
    `SELECT id, title, created_at, updated_at
     FROM chat_conversations
     WHERE hotel_id = $1 AND user_id = $2
     ORDER BY updated_at DESC
     LIMIT 50`,
    [hotelId, authResult.session.user.id]
  );

  return NextResponse.json({ conversations: rows });
}

// POST /api/hotels/:hotelId/conversations — create new conversation
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const body = await req.json();
  const title = body.title?.trim() || "New conversation";

  const conv = await queryOne<{ id: string; title: string; created_at: string }>(
    `INSERT INTO chat_conversations (hotel_id, user_id, title)
     VALUES ($1, $2, $3)
     RETURNING id, title, created_at`,
    [hotelId, authResult.session.user.id, title]
  );

  return NextResponse.json(conv, { status: 201 });
}
