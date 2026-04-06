import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const authResult = await requireAdmin();
  if (authResult.error) return authResult.error;

  const { userId } = await params;

  const rows = await query<{ id: string; name: string }>(
    `SELECT h.id, h.name FROM chain_hotel_access cha
     JOIN hotels h ON h.id = cha.hotel_id
     WHERE cha.user_id = $1
     ORDER BY h.name`,
    [userId]
  );

  return NextResponse.json(rows);
}
