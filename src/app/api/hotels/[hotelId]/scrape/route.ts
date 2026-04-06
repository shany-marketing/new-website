import { NextRequest, NextResponse } from "next/server";
import { requireHotelAccess } from "@/lib/auth";
import { queryOne } from "@/lib/db";
import { triggerApifyScrape, waitForScrapeAndIngest } from "@/lib/scrape";
import { PLATFORM_CONFIG, PLATFORMS } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";

/**
 * POST /api/hotels/[hotelId]/scrape
 * Triggers an Apify scrape for this hotel on a given platform.
 * Accepts optional { source, maxReviews } in body. Defaults to 'booking'.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  let source: ReviewSource = "booking";
  let maxReviews = 3000;
  try {
    const body = await req.json();
    if (body.source && (PLATFORMS as readonly string[]).includes(body.source)) {
      source = body.source as ReviewSource;
    }
    if (body.maxReviews) maxReviews = Math.min(body.maxReviews, 3000);
  } catch {
    // No body is fine — use defaults
  }

  const config = PLATFORM_CONFIG[source];

  if (config.disabled) {
    return NextResponse.json(
      { error: config.disabledReason || `${config.label} scraping is temporarily disabled` },
      { status: 503 }
    );
  }

  const urlColumn = config.urlColumn;

  const hotel = await queryOne<Record<string, string | null>>(
    `SELECT id, name, ${urlColumn} AS platform_url FROM hotels WHERE id = $1`,
    [hotelId]
  );

  if (!hotel) {
    return NextResponse.json({ error: "Hotel not found" }, { status: 404 });
  }

  if (!hotel.platform_url) {
    return NextResponse.json(
      { error: `No ${PLATFORM_CONFIG[source].label} URL configured for this hotel` },
      { status: 400 }
    );
  }

  try {
    const { runId, datasetId } = await triggerApifyScrape(hotel.platform_url, source, maxReviews);
    const batchId = crypto.randomUUID();

    // Fire-and-forget: poll Apify and ingest when done (batch-tracked for live progress)
    waitForScrapeAndIngest(hotelId, runId, datasetId, source, "full", batchId).catch((err) => {
      console.error(`Scrape ingest failed for hotel ${hotelId} (${source}):`, err);
    });

    return NextResponse.json({
      message: `${PLATFORM_CONFIG[source].label} scrape started`,
      apifyRunId: runId,
      datasetId,
      hotelId,
      source,
      batchId,
    });
  } catch (error) {
    console.error("Scrape trigger error:", error);
    return NextResponse.json(
      { error: "Failed to start scrape" },
      { status: 500 }
    );
  }
}
