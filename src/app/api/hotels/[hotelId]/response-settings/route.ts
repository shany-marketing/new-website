import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;

    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const hotel = await queryOne<{
      hotelier_name: string | null;
      hotelier_role: string | null;
      custom_response_prompt: string | null;
    }>(
      "SELECT hotelier_name, hotelier_role, custom_response_prompt FROM hotels WHERE id = $1",
      [hotelId]
    );

    return NextResponse.json({
      hotelierName: hotel?.hotelier_name ?? null,
      hotelierRole: hotel?.hotelier_role ?? "Hotel Manager",
      customResponsePrompt: hotel?.custom_response_prompt ?? null,
    });
  } catch (error) {
    console.error("Settings GET error:", error);
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
    const { hotelierName, hotelierRole, customResponsePrompt } = body;

    if (customResponsePrompt && customResponsePrompt.length > 20000) {
      return NextResponse.json(
        { error: "Custom prompt must be 20,000 characters or less" },
        { status: 400 }
      );
    }

    await query(
      `UPDATE hotels SET
        hotelier_name = $1,
        hotelier_role = $2,
        custom_response_prompt = $3
      WHERE id = $4`,
      [
        hotelierName || null,
        hotelierRole || "Hotel Manager",
        customResponsePrompt || null,
        hotelId,
      ]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Settings PUT error:", error);
    return NextResponse.json({ error: "Failed to update settings" }, { status: 500 });
  }
}
