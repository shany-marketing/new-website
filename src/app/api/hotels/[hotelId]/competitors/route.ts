import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { addCompetitor, getCompetitors, scrapeCompetitor } from "@/lib/competitor";
import { PLATFORMS } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const competitors = await getCompetitors(hotelId);
    return NextResponse.json({ competitors });
  } catch (error) {
    console.error("Competitors GET error:", error);
    return NextResponse.json({ error: "Failed to fetch competitors" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  try {
    const { hotelId } = await params;
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const body = await req.json();
    const { name, platformUrl, platform } = body;

    if (!name || typeof name !== "string" || name.length > 200) {
      return NextResponse.json({ error: "Name is required (max 200 chars)" }, { status: 400 });
    }
    if (!platformUrl || typeof platformUrl !== "string") {
      return NextResponse.json({ error: "Platform URL is required" }, { status: 400 });
    }
    if (!platform || !(PLATFORMS as readonly string[]).includes(platform)) {
      return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
    }

    const competitor = await addCompetitor(hotelId, name.trim(), platformUrl.trim(), platform as ReviewSource);

    // Fire-and-forget scrape
    scrapeCompetitor(competitor.id).catch((err) =>
      console.error(`Background competitor scrape failed:`, err)
    );

    return NextResponse.json({ competitor }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Failed to add competitor";
    const status = msg.includes("Maximum") || msg.includes("duplicate") ? 409 : 500;
    console.error("Competitors POST error:", error);
    return NextResponse.json({ error: msg }, { status });
  }
}
