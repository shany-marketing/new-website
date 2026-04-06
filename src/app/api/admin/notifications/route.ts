import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const notifications = await query(
    `SELECT id, type, title, message, hotel_id, metadata, created_at
     FROM admin_notifications
     WHERE NOT dismissed
     ORDER BY created_at DESC
     LIMIT 50`
  );

  return NextResponse.json(notifications);
}

export async function PATCH(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "Missing notification id" }, { status: 400 });
  }

  await query(
    "UPDATE admin_notifications SET dismissed = TRUE WHERE id = $1",
    [id]
  );

  return NextResponse.json({ ok: true });
}
