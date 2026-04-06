import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { hotelId } = await params;
  const { plan } = await req.json();

  if (!["free", "ratings", "premium"].includes(plan)) {
    return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
  }

  const hotel = await queryOne<{ id: string; plan: string }>(
    `UPDATE hotels SET plan = $1 WHERE id = $2 RETURNING id, plan`,
    [plan, hotelId]
  );

  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  return NextResponse.json(hotel);
}
