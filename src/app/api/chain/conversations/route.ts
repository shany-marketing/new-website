import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

// GET /api/chain/conversations — list chain-level conversations
export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  if (authResult.session.user.role !== "chain_manager") {
    return NextResponse.json({ error: "Chain managers only" }, { status: 403 });
  }

  const rows = await query(
    `SELECT id, title, created_at, updated_at
     FROM chat_conversations
     WHERE hotel_id IS NULL AND user_id = $1
     ORDER BY updated_at DESC
     LIMIT 50`,
    [authResult.session.user.id]
  );

  return NextResponse.json({ conversations: rows });
}

// POST /api/chain/conversations — create new chain conversation
export async function POST(req: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  if (authResult.session.user.role !== "chain_manager") {
    return NextResponse.json({ error: "Chain managers only" }, { status: 403 });
  }

  const body = await req.json();
  const title = body.title?.trim() || "New conversation";

  const conv = await queryOne<{ id: string; title: string; created_at: string }>(
    `INSERT INTO chat_conversations (hotel_id, user_id, title)
     VALUES (NULL, $1, $2)
     RETURNING id, title, created_at`,
    [authResult.session.user.id, title]
  );

  return NextResponse.json(conv, { status: 201 });
}
