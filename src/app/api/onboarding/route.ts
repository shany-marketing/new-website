import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { triggerApifyScrape, waitForScrapeAndIngest } from "@/lib/scrape";
import { cleanPlatformUrl } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user already has a hotel
  const existingUser = await queryOne<{ hotel_id: string | null }>(
    "SELECT hotel_id FROM users WHERE id = $1",
    [session.user.id]
  );

  if (existingUser?.hotel_id) {
    return NextResponse.json(
      { error: "You are already associated with a hotel" },
      { status: 400 }
    );
  }

  const { hotelName, bookingUrl, googleUrl, expediaUrl, tripadvisorUrl } = await req.json();

  if (!hotelName?.trim()) {
    return NextResponse.json(
      { error: "Hotel name is required" },
      { status: 400 }
    );
  }

  // Normalize platform URLs (strip tracking params, fragments, etc.)
  const cleanBooking = bookingUrl?.trim() ? cleanPlatformUrl(bookingUrl) : null;
  const cleanGoogle = googleUrl?.trim() ? cleanPlatformUrl(googleUrl) : null;
  const cleanExpedia = expediaUrl?.trim() ? cleanPlatformUrl(expediaUrl) : null;
  const cleanTripadvisor = tripadvisorUrl?.trim() ? cleanPlatformUrl(tripadvisorUrl) : null;

  // Check for duplicate booking URL
  if (cleanBooking) {
    const existing = await queryOne<{ id: string; name: string }>(
      "SELECT id, name FROM hotels WHERE booking_url = $1",
      [cleanBooking]
    );
    if (existing) {
      return NextResponse.json(
        { error: `A hotel with this Booking.com URL already exists: ${existing.name}` },
        { status: 409 }
      );
    }
  }

  // Create the hotel with all platform URLs
  const hotel = await queryOne<{ id: string; name: string }>(
    `INSERT INTO hotels (name, booking_url, google_url, expedia_url, tripadvisor_url, plan)
     VALUES ($1, $2, $3, $4, $5, 'free') RETURNING id, name`,
    [hotelName.trim(), cleanBooking, cleanGoogle, cleanExpedia, cleanTripadvisor]
  );

  if (!hotel) {
    return NextResponse.json({ error: "Failed to create hotel" }, { status: 500 });
  }

  // Link user to hotel
  await queryOne(
    `UPDATE users SET hotel_id = $1 WHERE id = $2 RETURNING id`,
    [hotel.id, session.user.id]
  );

  // Auto-trigger scrapes for each platform that has a URL
  const platformUrls: { source: ReviewSource; url: string }[] = [];
  if (cleanBooking) platformUrls.push({ source: "booking", url: cleanBooking });
  if (cleanGoogle) platformUrls.push({ source: "google", url: cleanGoogle });
  if (cleanExpedia) platformUrls.push({ source: "expedia", url: cleanExpedia });
  if (cleanTripadvisor) platformUrls.push({ source: "tripadvisor", url: cleanTripadvisor });

  const scrapesStarted: ReviewSource[] = [];
  const batchId = platformUrls.length > 0 ? crypto.randomUUID() : null;

  for (const { source, url } of platformUrls) {
    try {
      const { runId, datasetId } = await triggerApifyScrape(url, source);

      // Fire-and-forget: poll Apify and ingest when done (batch-coordinated)
      waitForScrapeAndIngest(hotel.id, runId, datasetId, source, "full", batchId!).catch((err) => {
        console.error(`Auto-scrape failed for hotel ${hotel.id} (${source}):`, err);
      });

      scrapesStarted.push(source);
    } catch (err) {
      console.error(`Auto-scrape trigger failed for ${source}:`, err);
    }
  }

  return NextResponse.json({
    hotelId: hotel.id,
    hotelName: hotel.name,
    scrapeStarted: scrapesStarted.length > 0,
    scrapesStarted,
    batchId,
  });
}
