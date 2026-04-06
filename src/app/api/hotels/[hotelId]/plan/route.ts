import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getHotelPlan, getHotelAddons, getPlatformReviewCounts } from "@/lib/plan";
import { requireHotelAccess, requireAdmin } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const [plan, addons, platformCounts] = await Promise.all([
      getHotelPlan(hotelId),
      getHotelAddons(hotelId),
      getPlatformReviewCounts(hotelId),
    ]);
    return NextResponse.json({ plan, addons, platformCounts });
  } catch (error) {
    console.error("Plan fetch error:", error);
    return NextResponse.json({ plan: "free" });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  // Only admins can change hotel plans
  const adminResult = await requireAdmin();
  if (adminResult.error) return adminResult.error;

  try {
    const body = await req.json();
    const plan = body.plan;
    if (!["free", "ratings", "premium"].includes(plan)) {
      return NextResponse.json({ error: "Plan must be 'free', 'ratings', or 'premium'" }, { status: 400 });
    }
    await query("UPDATE hotels SET plan = $1 WHERE id = $2", [plan, hotelId]);
    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Plan update error:", error);
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 });
  }
}
