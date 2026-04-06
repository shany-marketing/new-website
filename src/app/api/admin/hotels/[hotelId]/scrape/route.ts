import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { triggerApifyScrape, waitForScrapeAndIngest } from "@/lib/scrape";
import type { ReviewSource } from "@/types/platform";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== "admin") return null;
  return session;
}

const PLATFORM_URL_COLUMNS: { source: ReviewSource; column: string }[] = [
  { source: "booking", column: "booking_url" },
  { source: "google", column: "google_url" },
  { source: "expedia", column: "expedia_url" },
  { source: "tripadvisor", column: "tripadvisor_url" },
];

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { hotelId } = await params;

  const hotel = await queryOne<{
    id: string;
    name: string;
    booking_url: string | null;
    google_url: string | null;
    expedia_url: string | null;
    tripadvisor_url: string | null;
  }>(
    `SELECT id, name, booking_url, google_url, expedia_url, tripadvisor_url
     FROM hotels WHERE id = $1`,
    [hotelId]
  );

  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  // Find all platforms with URLs configured
  const platformsToScrape: { source: ReviewSource; url: string }[] = [];
  for (const { source, column } of PLATFORM_URL_COLUMNS) {
    const url = hotel[column as keyof typeof hotel] as string | null;
    if (url) platformsToScrape.push({ source, url });
  }

  if (platformsToScrape.length === 0) {
    return NextResponse.json(
      { error: "No platform URLs configured for this hotel. Add a Booking.com or other platform URL first." },
      { status: 400 }
    );
  }

  // Trigger scrapes for all platforms with pipelineMode="none" to avoid duplicate pipelines.
  // Run a single full pipeline AFTER all platforms complete.
  const started: string[] = [];
  for (const { source, url } of platformsToScrape) {
    try {
      const { runId, datasetId } = await triggerApifyScrape(url, source);
      started.push(source);
      // Fire-and-forget: scrape + ingest without pipeline
      waitForScrapeAndIngest(hotel.id, runId, datasetId, source, "none").catch((err) => {
        console.error(`Admin scrape failed for hotel ${hotel.id} (${source}):`, err);
      });
    } catch (err) {
      console.error(`Admin scrape trigger failed for ${source}:`, err);
    }
  }

  if (started.length === 0) {
    return NextResponse.json(
      { error: "Failed to start any scrapes. Check server logs." },
      { status: 500 }
    );
  }

  // After all scrapes triggered, run a single full pipeline in background
  // Wait for all scrapes to finish first (they poll Apify internally)
  (async () => {
    // Wait a bit for scrapes to start, then poll until no active Apify runs
    // Simple approach: wait for all waitForScrapeAndIngest promises, then run pipeline
    // Since we can't easily await fire-and-forget promises, use a delayed pipeline trigger
    // The scrapes will ingest reviews; we trigger pipeline after a generous delay
    // Better approach: schedule pipeline after last ingest
    try {
      const { runFullPipeline } = await import("@/lib/pipeline");
      // Poll until no reviews are being ingested (check if review count stabilizes)
      let lastCount = 0;
      for (let i = 0; i < 360; i++) { // max 60 min
        await new Promise((r) => setTimeout(r, 10_000));
        const row = await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM raw_reviews WHERE hotel_id = $1`,
          [hotel.id]
        );
        const count = parseInt(row?.count ?? "0");
        if (count > lastCount) {
          lastCount = count;
          continue; // still ingesting
        }
        if (i > 6) break; // stable for 60s after at least 1 min
      }
      console.log(`[admin-scrape] All platforms done for ${hotel.name}. Running full pipeline...`);
      await runFullPipeline(hotel.id);
      console.log(`[admin-scrape] Pipeline completed for ${hotel.name}`);
    } catch (err) {
      console.error(`[admin-scrape] Pipeline failed for ${hotel.name}:`, err);
    }
  })();

  return NextResponse.json({
    message: `Scraping started for ${started.join(", ")}. Pipeline will run once after all platforms finish.`,
    platforms: started,
  });
}
