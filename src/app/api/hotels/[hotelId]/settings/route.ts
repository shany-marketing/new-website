import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { cleanPlatformUrl } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";
import { triggerApifyScrape, waitForScrapeAndIngest } from "@/lib/scrape";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const hotel = await queryOne<{
    name: string;
    booking_url: string | null;
    google_url: string | null;
    expedia_url: string | null;
    tripadvisor_url: string | null;
  }>(
    "SELECT name, booking_url, google_url, expedia_url, tripadvisor_url FROM hotels WHERE id = $1",
    [hotelId]
  );

  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  return NextResponse.json(hotel);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  const body = await req.json();
  const { bookingUrl, googleUrl, expediaUrl, tripadvisorUrl } = body;

  // Fetch current URLs to detect new additions
  const current = await queryOne<{
    booking_url: string | null;
    google_url: string | null;
    expedia_url: string | null;
    tripadvisor_url: string | null;
  }>(
    "SELECT booking_url, google_url, expedia_url, tripadvisor_url FROM hotels WHERE id = $1",
    [hotelId]
  );

  if (!current) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  const cleanBooking = bookingUrl?.trim() ? cleanPlatformUrl(bookingUrl) : null;
  const cleanGoogle = googleUrl?.trim() ? cleanPlatformUrl(googleUrl) : null;
  const cleanExpedia = expediaUrl?.trim() ? cleanPlatformUrl(expediaUrl) : null;
  const cleanTripadvisor = tripadvisorUrl?.trim() ? cleanPlatformUrl(tripadvisorUrl) : null;

  // Update hotel URLs
  await queryOne(
    `UPDATE hotels SET
       booking_url = $2,
       google_url = $3,
       expedia_url = $4,
       tripadvisor_url = $5
     WHERE id = $1 RETURNING id`,
    [hotelId, cleanBooking, cleanGoogle, cleanExpedia, cleanTripadvisor]
  );

  // Auto-scrape newly added platforms (was null, now set)
  const newPlatforms: { source: ReviewSource; url: string }[] = [];
  if (cleanBooking && !current.booking_url) newPlatforms.push({ source: "booking", url: cleanBooking });
  if (cleanGoogle && !current.google_url) newPlatforms.push({ source: "google", url: cleanGoogle });
  if (cleanExpedia && !current.expedia_url) newPlatforms.push({ source: "expedia", url: cleanExpedia });
  if (cleanTripadvisor && !current.tripadvisor_url) newPlatforms.push({ source: "tripadvisor", url: cleanTripadvisor });

  const scrapesStarted: ReviewSource[] = [];
  const batchId = newPlatforms.length > 0 ? crypto.randomUUID() : null;

  for (const { source, url } of newPlatforms) {
    try {
      const { runId, datasetId } = await triggerApifyScrape(url, source);
      waitForScrapeAndIngest(hotelId, runId, datasetId, source, "full", batchId!).catch((err) => {
        console.error(`Auto-scrape failed for hotel ${hotelId} (${source}):`, err);
      });
      scrapesStarted.push(source);
    } catch (err) {
      console.error(`Auto-scrape trigger failed for ${source}:`, err);
    }
  }

  return NextResponse.json({
    bookingUrl: cleanBooking,
    googleUrl: cleanGoogle,
    expediaUrl: cleanExpedia,
    tripadvisorUrl: cleanTripadvisor,
    scrapesStarted,
    batchId,
  });
}
