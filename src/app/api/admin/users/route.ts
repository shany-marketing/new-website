import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const users = await query<{
    id: string;
    email: string;
    name: string | null;
    role: string;
    hotel_id: string | null;
    hotel_name: string | null;
    chain_name: string | null;
    chain_hotel_count: number;
    created_at: string;
  }>(
    `SELECT u.id, u.email, u.name, COALESCE(u.role, 'user') as role,
            u.hotel_id, h.name AS hotel_name, u.created_at::text,
            u.chain_name,
            (SELECT COUNT(*)::int FROM chain_hotel_access cha WHERE cha.user_id = u.id) AS chain_hotel_count
     FROM users u
     LEFT JOIN hotels h ON h.id = u.hotel_id
     GROUP BY u.id, h.name
     ORDER BY u.created_at DESC`
  );

  return NextResponse.json(users);
}

export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId, hotelId, role, chainName, chainHotelIds } = await req.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  const updates: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  // Update role if provided
  if (role !== undefined) {
    if (!["user", "admin", "chain_manager"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    params.push(role);
    updates.push(`role = $${paramIdx++}`);
  }

  if (hotelId !== undefined) {
    params.push(hotelId || null);
    updates.push(`hotel_id = $${paramIdx++}`);
  }

  if (chainName !== undefined) {
    params.push(chainName || null);
    updates.push(`chain_name = $${paramIdx++}`);
  }

  if (updates.length === 0 && !Array.isArray(chainHotelIds)) {
    return NextResponse.json({ error: "Nothing to update" }, { status: 400 });
  }

  let user: { id: string; email: string } | null = null;

  if (updates.length > 0) {
    params.push(userId);
    user = await queryOne<{ id: string; email: string }>(
      `UPDATE users SET ${updates.join(", ")} WHERE id = $${paramIdx} RETURNING id, email`,
      params
    );
  } else {
    user = await queryOne<{ id: string; email: string }>(
      `SELECT id, email FROM users WHERE id = $1`,
      [userId]
    );
  }

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Handle chain hotel assignments
  if (chainHotelIds !== undefined && Array.isArray(chainHotelIds)) {
    await query("DELETE FROM chain_hotel_access WHERE user_id = $1", [userId]);
    for (const hid of chainHotelIds) {
      if (typeof hid === "string" && hid.length > 0) {
        await query(
          "INSERT INTO chain_hotel_access (user_id, hotel_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
          [userId, hid]
        );
      }
    }
  }

  return NextResponse.json(user);
}

export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Prevent deleting yourself
  if (userId === session.user?.id) {
    return NextResponse.json({ error: "Cannot delete your own account" }, { status: 400 });
  }

  await query("DELETE FROM chain_hotel_access WHERE user_id = $1", [userId]);
  const deleted = await queryOne<{ id: string }>(
    "DELETE FROM users WHERE id = $1 RETURNING id",
    [userId]
  );

  if (!deleted) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
