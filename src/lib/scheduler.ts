import { query } from "./db";
import { triggerApifyScrape, waitForScrapeAndIngest } from "./scrape";
import { runIncrementalPipeline } from "./pipeline";
import type { ReviewSource } from "@/types/platform";

interface HotelRefreshResult {
  hotelId: string;
  hotelName: string;
  platforms: string[];
  totalFetched: number;
  totalInserted: number;
  pipelineStatus: "completed" | "failed" | "skipped";
  error?: string;
}

const PLATFORM_URL_COLUMNS: { source: ReviewSource; column: string }[] = [
  { source: "booking", column: "booking_url" },
  { source: "google", column: "google_url" },
  { source: "expedia", column: "expedia_url" },
  { source: "tripadvisor", column: "tripadvisor_url" },
];

/**
 * Weekly refresh: scrape new reviews for all active hotels and run incremental pipeline.
 * Processes hotels sequentially to avoid overwhelming Apify rate limits.
 */
export async function runWeeklyRefresh(): Promise<HotelRefreshResult[]> {
  // Fetch hotels that have platform URLs AND have had at least one completed pipeline run
  const hotels = await query<{
    id: string;
    name: string;
    booking_url: string | null;
    google_url: string | null;
    expedia_url: string | null;
    tripadvisor_url: string | null;
  }>(
    `SELECT h.id, h.name, h.booking_url, h.google_url, h.expedia_url, h.tripadvisor_url
     FROM hotels h
     WHERE (h.booking_url IS NOT NULL OR h.google_url IS NOT NULL
            OR h.expedia_url IS NOT NULL OR h.tripadvisor_url IS NOT NULL)
       AND EXISTS (
         SELECT 1 FROM pipeline_runs pr
         WHERE pr.hotel_id = h.id AND pr.status = 'completed'
       )
     ORDER BY h.created_at`
  );

  console.log(`[scheduler] Weekly refresh starting for ${hotels.length} hotels`);
  const results: HotelRefreshResult[] = [];

  for (const hotel of hotels) {
    const result: HotelRefreshResult = {
      hotelId: hotel.id,
      hotelName: hotel.name,
      platforms: [],
      totalFetched: 0,
      totalInserted: 0,
      pipelineStatus: "skipped",
    };

    try {
      // Scrape all configured platforms (pipeline mode = "none", we run it once after)
      for (const { source, column } of PLATFORM_URL_COLUMNS) {
        const url = hotel[column as keyof typeof hotel] as string | null;
        if (!url) continue;

        try {
          const { runId, datasetId } = await triggerApifyScrape(url, source);
          const { fetched, inserted } = await waitForScrapeAndIngest(
            hotel.id, runId, datasetId, source, "none"
          );
          result.platforms.push(source);
          result.totalFetched += fetched;
          result.totalInserted += inserted;
          console.log(`[scheduler] ${hotel.name} / ${source}: fetched=${fetched}, inserted=${inserted}`);
        } catch (err) {
          console.error(`[scheduler] ${hotel.name} / ${source} scrape failed:`, err);
        }
      }

      // Run incremental pipeline once (covers all newly ingested reviews)
      if (result.totalInserted > 0) {
        const pipelineResult = await runIncrementalPipeline(hotel.id);
        result.pipelineStatus = pipelineResult.status === "completed" ? "completed" : "failed";
        if (pipelineResult.error) result.error = pipelineResult.error;

        // Auto-respond to new reviews
        try {
          const { processAutoRespond } = await import("./auto-respond");
          const newReviewIds = await query<{ id: string }>(
            `SELECT id FROM raw_reviews
             WHERE hotel_id = $1 AND ai_response IS NULL AND property_response IS NULL
               AND review_date >= NOW() - INTERVAL '14 days'
             ORDER BY review_date DESC`,
            [hotel.id]
          );
          if (newReviewIds.length > 0) {
            await processAutoRespond(hotel.id, newReviewIds.map(r => r.id));
          }
        } catch (err) {
          console.error(`[scheduler] Auto-respond failed for ${hotel.name}:`, err);
        }
      }

      console.log(`[scheduler] ${hotel.name}: done (inserted=${result.totalInserted}, pipeline=${result.pipelineStatus})`);
    } catch (err) {
      result.pipelineStatus = "failed";
      result.error = err instanceof Error ? err.message : "Unknown error";
      console.error(`[scheduler] ${hotel.name} failed:`, err);
    }

    results.push(result);
  }

  console.log(`[scheduler] Weekly refresh complete: ${results.length} hotels processed`);
  return results;
}
