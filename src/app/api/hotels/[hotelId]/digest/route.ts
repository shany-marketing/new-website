import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { getDigestSettings, saveDigestSettings } from "@/lib/email-digest";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const settings = await getDigestSettings(hotelId);
    return NextResponse.json(settings || {
      enabled: false,
      emailAddress: "",
      frequency: "weekly",
      dayOfWeek: 1,
    });
  } catch (error) {
    console.error("Digest GET error:", error);
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
    const { enabled, emailAddress, frequency, dayOfWeek } = body;

    if (enabled && (!emailAddress || !emailAddress.includes("@"))) {
      return NextResponse.json({ error: "Valid email address required" }, { status: 400 });
    }

    await saveDigestSettings(hotelId, { enabled, emailAddress, frequency, dayOfWeek });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Digest PUT error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
