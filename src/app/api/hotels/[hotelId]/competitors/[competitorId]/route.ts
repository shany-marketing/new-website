import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { removeCompetitor, scrapeCompetitor } from "@/lib/competitor";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; competitorId: string }> }
) {
  try {
    const { hotelId, competitorId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const removed = await removeCompetitor(competitorId, hotelId);
    if (!removed) {
      return NextResponse.json({ error: "Competitor not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Competitor DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove competitor" }, { status: 500 });
  }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; competitorId: string }> }
) {
  try {
    const { hotelId, competitorId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    // Fire-and-forget re-scrape
    scrapeCompetitor(competitorId).catch((err) =>
      console.error(`Background competitor re-scrape failed:`, err)
    );

    return NextResponse.json({ status: "scraping" });
  } catch (error) {
    console.error("Competitor rescrape error:", error);
    return NextResponse.json({ error: "Failed to trigger scrape" }, { status: 500 });
  }
}
