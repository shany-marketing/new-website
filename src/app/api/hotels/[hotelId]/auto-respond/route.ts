import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { getAutoRespondSettings, saveAutoRespondSettings } from "@/lib/auto-respond";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const settings = await getAutoRespondSettings(hotelId);
    return NextResponse.json(settings || {
      enabled: false,
      minRating: 8.0,
      skipWithComplaints: true,
      autoPost: false,
      platforms: ["booking"],
      maxPerRun: 10,
    });
  } catch (error) {
    console.error("Auto-respond GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const body = await req.json();
    const { enabled, minRating, skipWithComplaints, autoPost, platforms, maxPerRun } = body;

    // Validate
    if (minRating != null && (minRating < 1 || minRating > 10)) {
      return NextResponse.json({ error: "minRating must be between 1 and 10" }, { status: 400 });
    }
    if (maxPerRun != null && (maxPerRun < 1 || maxPerRun > 50)) {
      return NextResponse.json({ error: "maxPerRun must be between 1 and 50" }, { status: 400 });
    }

    await saveAutoRespondSettings(hotelId, {
      enabled,
      minRating,
      skipWithComplaints,
      autoPost,
      platforms,
      maxPerRun,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Auto-respond PUT error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
