import { NextRequest, NextResponse } from "next/server";
import { checkFeatureAccess } from "@/lib/plan";
import { requireHotelAccess } from "@/lib/auth";
import { renotifyAssignees } from "@/lib/staff-notifications";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    if (!(await checkFeatureAccess(hotelId, "staff_actions"))) {
      return NextResponse.json(
        { error: "Staff action tracking requires the Analytics add-on" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { actionId } = body;

    if (!actionId) {
      return NextResponse.json({ error: "actionId is required" }, { status: 400 });
    }

    const result = await renotifyAssignees(actionId, hotelId);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Staff actions notify error:", error);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}
