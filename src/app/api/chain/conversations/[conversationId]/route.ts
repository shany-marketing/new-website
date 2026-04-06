import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireAuth } from "@/lib/auth";

type Params = Promise<{ conversationId: string }>;

// GET — load a chain conversation with all messages
export async function GET(
  _req: NextRequest,
  { params }: { params: Params }
) {
  const { conversationId } = await params;
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  if (authResult.session.user.role !== "chain_manager") {
    return NextResponse.json({ error: "Chain managers only" }, { status: 403 });
  }

  const conv = await queryOne<{ id: string; title: string; created_at: string }>(
    `SELECT id, title, created_at FROM chat_conversations
     WHERE id = $1 AND hotel_id IS NULL AND user_id = $2`,
    [conversationId, authResult.session.user.id]
  );

  if (!conv) {
    return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  }

  const messages = await query<{ role: string; text: string; chart_spec: string | null }>(
    `SELECT role, text, chart_spec FROM chat_messages
     WHERE conversation_id = $1
     ORDER BY created_at`,
    [conversationId]
  );

  return NextResponse.json({
    ...conv,
    messages: messages.map((m) => ({
      role: m.role,
      text: m.text,
      chart: m.chart_spec ? JSON.parse(m.chart_spec) : undefined,
    })),
  });
}

// PATCH — update conversation title
export async function PATCH(
  req: NextRequest,
  { params }: { params: Params }
) {
  const { conversationId } = await params;
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  if (authResult.session.user.role !== "chain_manager") {
    return NextResponse.json({ error: "Chain managers only" }, { status: 403 });
  }

  const body = await req.json();
  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  const updated = await queryOne(
    `UPDATE chat_conversations SET title = $1, updated_at = now()
     WHERE id = $2 AND hotel_id IS NULL AND user_id = $3
     RETURNING id`,
    [title, conversationId, authResult.session.user.id]
  );

  if (!updated) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

// DELETE — delete a chain conversation
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Params }
) {
  const { conversationId } = await params;
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  if (authResult.session.user.role !== "chain_manager") {
    return NextResponse.json({ error: "Chain managers only" }, { status: 403 });
  }

  await queryOne(
    `DELETE FROM chat_conversations
     WHERE id = $1 AND hotel_id IS NULL AND user_id = $2
     RETURNING id`,
    [conversationId, authResult.session.user.id]
  );

  return NextResponse.json({ ok: true });
}
