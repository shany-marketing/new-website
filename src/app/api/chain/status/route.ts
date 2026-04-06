import { NextResponse } from "next/server";
import { auth, getChainHotelIds } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id || session.user.role !== "chain_manager") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const hotelIds = await getChainHotelIds(session.user.id);
    if (hotelIds.length === 0) {
      return NextResponse.json({ ready: false, pending: [] });
    }

    const rows = await query<{ id: string; name: string; status: string | null }>(
      `SELECT h.id, h.name, pr.status
       FROM hotels h
       LEFT JOIN LATERAL (
         SELECT status FROM pipeline_runs WHERE hotel_id = h.id ORDER BY started_at DESC LIMIT 1
       ) pr ON true
       WHERE h.id = ANY($1::uuid[])`,
      [hotelIds]
    );

    const pending = rows.filter((r) => r.status !== "completed").map((r) => r.name);
    return NextResponse.json({ ready: pending.length === 0, pending });
  } catch (error) {
    console.error("Chain status error:", error);
    return NextResponse.json({ error: "Failed to check status" }, { status: 500 });
  }
}
