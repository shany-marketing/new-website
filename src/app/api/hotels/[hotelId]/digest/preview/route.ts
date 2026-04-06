import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { buildDigestData, buildDigestHtml } from "@/lib/email-digest";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const data = await buildDigestData(hotelId, 7);
    const html = buildDigestHtml(data);

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" },
    });
  } catch (error) {
    console.error("Digest preview error:", error);
    return NextResponse.json({ error: "Failed to generate preview" }, { status: 500 });
  }
}
