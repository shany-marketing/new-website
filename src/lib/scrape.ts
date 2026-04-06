import { query, queryOne } from "./db";
import type { ReviewSource } from "@/types/platform";
import { PLATFORM_CONFIG } from "@/types/platform";
import { notifyHotelUsers } from "./notifications";

const APIFY_BASE_URL = "https://api.apify.com/v2";

// ── Scrape run tracking helpers ─────────────────────────────────────

async function createScrapeRun(
  hotelId: string,
  batchId: string,
  source: ReviewSource,
  apifyRunId: string,
  datasetId: string
): Promise<string> {
  const row = await queryOne<{ id: string }>(
    `INSERT INTO scrape_runs (hotel_id, batch_id, source, apify_run_id, dataset_id, status)
     VALUES ($1, $2, $3, $4, $5, 'running')
     RETURNING id`,
    [hotelId, batchId, source, apifyRunId, datasetId]
  );
  return row!.id;
}

async function updateScrapeRun(
  scrapeRunId: string,
  updates: {
    status?: string;
    reviewsFound?: number;
    reviewsInserted?: number;
    statusMessage?: string | null;
    errorMessage?: string;
    completed?: boolean;
    apifyRunId?: string;
    datasetId?: string;
  }
) {
  const sets: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (updates.status !== undefined) { sets.push(`status = $${idx++}`); params.push(updates.status); }
  if (updates.reviewsFound !== undefined) { sets.push(`reviews_found = $${idx++}`); params.push(updates.reviewsFound); }
  if (updates.reviewsInserted !== undefined) { sets.push(`reviews_inserted = $${idx++}`); params.push(updates.reviewsInserted); }
  if (updates.statusMessage !== undefined) { sets.push(`status_message = $${idx++}`); params.push(updates.statusMessage); }
  if (updates.errorMessage !== undefined) { sets.push(`error_message = $${idx++}`); params.push(updates.errorMessage); }
  if (updates.completed) { sets.push(`completed_at = NOW()`); }
  if (updates.apifyRunId !== undefined) { sets.push(`apify_run_id = $${idx++}`); params.push(updates.apifyRunId); }
  if (updates.datasetId !== undefined) { sets.push(`dataset_id = $${idx++}`); params.push(updates.datasetId); }
  if (sets.length === 0) return;
  params.push(scrapeRunId);
  await query(`UPDATE scrape_runs SET ${sets.join(", ")} WHERE id = $${idx}`, params);
}

/**
 * After a scrape completes (success or fail), check if all scrapes in the batch are done.
 * If yes, trigger the pipeline once for all platforms combined.
 */
async function checkBatchCompletionAndTrigger(
  hotelId: string,
  batchId: string,
  pipelineMode: "full" | "incremental" | "none"
) {
  const pending = await queryOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM scrape_runs
     WHERE batch_id = $1 AND status IN ('running', 'ingesting')`,
    [batchId]
  );
  if (parseInt(pending?.count ?? "0") > 0) {
    console.log(`[scrape] Batch ${batchId}: other scrapes still running, skipping pipeline trigger`);
    return;
  }

  const batchStats = await queryOne<{ total_inserted: string }>(
    `SELECT COALESCE(SUM(reviews_inserted), 0)::text AS total_inserted
     FROM scrape_runs WHERE batch_id = $1`,
    [batchId]
  );
  const totalInserted = parseInt(batchStats?.total_inserted ?? "0");

  if (totalInserted === 0 || pipelineMode === "none") {
    console.log(`[scrape] Batch ${batchId}: no reviews inserted or pipeline=none, skipping`);
    return;
  }

  try {
    if (pipelineMode === "incremental") {
      const { runIncrementalPipeline } = await import("./pipeline");
      console.log(`[scrape] Batch ${batchId}: all scrapes done, running incremental pipeline for hotel ${hotelId}...`);
      await runIncrementalPipeline(hotelId);
    } else {
      const { runFullPipeline } = await import("./pipeline");
      console.log(`[scrape] Batch ${batchId}: all scrapes done, running full pipeline for hotel ${hotelId}...`);
      await runFullPipeline(hotelId);
    }
    console.log(`[scrape] Batch ${batchId}: pipeline completed for hotel ${hotelId}`);
  } catch (err) {
    console.error(`[scrape] Batch ${batchId}: auto-pipeline failed for hotel ${hotelId}:`, err);
  }

  // Auto-respond to eligible new reviews
  try {
    const newReviewIds = await query<{ id: string }>(
      `SELECT rr.id FROM raw_reviews rr
       WHERE rr.hotel_id = $1
         AND rr.created_at >= (SELECT MIN(created_at) FROM scrape_runs WHERE batch_id = $2)
         AND rr.ai_response IS NULL AND rr.property_response IS NULL`,
      [hotelId, batchId]
    );
    if (newReviewIds.length > 0) {
      const { processAutoRespond } = await import("./auto-respond");
      await processAutoRespond(hotelId, newReviewIds.map(r => r.id));
    }
  } catch (err) {
    console.error(`[scrape] Batch ${batchId}: auto-respond failed:`, err);
  }
}

/**
 * Get the current scrape status for a hotel (most recent active or recently completed batch).
 */
export async function getScrapeStatus(hotelId: string): Promise<{
  scraping: boolean;
  batchId: string | null;
  platforms: Array<{
    source: string;
    status: string;
    reviewsFound: number;
    reviewsInserted: number;
    statusMessage: string | null;
    createdAt: string;
    completedAt: string | null;
  }>;
}> {
  const runs = await query<{
    batch_id: string;
    source: string;
    status: string;
    reviews_found: number;
    reviews_inserted: number;
    status_message: string | null;
    created_at: string;
    completed_at: string | null;
  }>(`
    SELECT sr.batch_id, sr.source, sr.status, sr.reviews_found,
           sr.reviews_inserted, sr.status_message,
           sr.created_at::text, sr.completed_at::text
    FROM scrape_runs sr
    WHERE sr.hotel_id = $1
      AND (
        sr.status IN ('running', 'ingesting')
        OR sr.created_at >= NOW() - INTERVAL '5 minutes'
      )
    ORDER BY sr.created_at DESC
  `, [hotelId]);

  if (runs.length === 0) {
    return { scraping: false, batchId: null, platforms: [] };
  }

  const latestBatchId = runs[0].batch_id;
  const batchRuns = runs.filter(r => r.batch_id === latestBatchId);
  const anyRunning = batchRuns.some(r => r.status === "running" || r.status === "ingesting");

  return {
    scraping: anyRunning,
    batchId: latestBatchId,
    platforms: batchRuns.map(r => ({
      source: r.source,
      status: r.status,
      reviewsFound: r.reviews_found,
      reviewsInserted: r.reviews_inserted,
      statusMessage: r.status_message,
      createdAt: r.created_at,
      completedAt: r.completed_at,
    })),
  };
}

// ── Core types ──────────────────────────────────────────────────────

interface ScrapeResult {
  runId: string;
  datasetId: string;
  status: string;
  usedFallback?: boolean;
}

/**
 * Build platform-specific Apify actor input payload.
 * For Booking.com the input format differs between the primary (voyager) and fallback (plowdata) actors.
 */
function buildActorInput(
  source: ReviewSource,
  url: string,
  maxReviews: number,
  actorId?: string
): Record<string, unknown> {
  switch (source) {
    case "booking": {
      const isPlowdata = actorId?.includes("plowdata");
      if (isPlowdata) {
        return {
          urls: [{ url }],
          maxReviews,
          sortReviewsBy: "f_recent_desc",
          reviewScores: ["ALL"],
          proxyConfiguration: {
            useApifyProxy: true,
            apifyProxyGroups: ["RESIDENTIAL"],
          },
        };
      }
      // voyager (primary — cheaper CheerioCrawler)
      return {
        startUrls: [{ url }],
        maxReviewsPerHotel: maxReviews,
        sortReviewsBy: "f_recent_desc",
        reviewScores: ["ALL"],
        proxyConfiguration: {
          useApifyProxy: true,
          apifyProxyGroups: ["RESIDENTIAL"],
        },
      };
    }
    case "google":
      return {
        startUrls: [{ url }],
        maxReviews,
        reviewsSort: "newest",
        language: "en",
        reviewsOrigin: "all",
      };
    case "expedia":
      return {
        startUrls: [{ url }],
        maxReviews,
      };
    case "tripadvisor":
      return {
        startUrls: [{ url }],
        maxItemsPerQuery: maxReviews,
        reviewRatings: ["ALL_REVIEW_RATINGS"],
        reviewsLanguages: ["ALL_REVIEW_LANGUAGES"],
      };
  }
}

/**
 * Trigger a single Apify actor run. Internal helper — callers should use triggerApifyScrape().
 */
async function triggerActor(
  actorId: string,
  input: Record<string, unknown>,
  token: string
): Promise<ScrapeResult> {
  const response = await fetch(
    `${APIFY_BASE_URL}/acts/${actorId}/runs?token=${token}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Apify trigger failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  const run = data.data;

  return {
    runId: run.id,
    datasetId: run.defaultDatasetId,
    status: run.status,
  };
}

/**
 * Trigger an Apify scraper run for a hotel on a given platform.
 * Returns immediately with the run ID — the scrape runs async on Apify.
 */
export async function triggerApifyScrape(
  platformUrl: string,
  source: ReviewSource = "booking",
  maxReviews: number = 3000
): Promise<ScrapeResult> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured");

  const config = PLATFORM_CONFIG[source];

  if (config.disabled) {
    console.warn(`[scrape] Skipping ${source} — ${config.disabledReason || "platform is temporarily disabled"}`);
    throw new Error(config.disabledReason || `${config.label} scraping is temporarily disabled`);
  }

  const actorId = config.apifyActorId;
  const input = buildActorInput(source, platformUrl, maxReviews, actorId);

  return triggerActor(actorId, input, token);
}

/**
 * Poll an Apify run until it finishes. Returns the final status and review count.
 * When scrapeRunId is provided, updates the scrape_runs record with live progress.
 */
async function pollApifyRun(
  runId: string,
  datasetId: string,
  token: string,
  scrapeRunId?: string
): Promise<{ status: "ok" | "failed"; reviews: Record<string, unknown>[] }> {
  const maxAttempts = 180; // 180 * 10s = 30 min
  for (let i = 0; i < maxAttempts; i++) {
    const statusRes = await fetch(
      `${APIFY_BASE_URL}/actor-runs/${runId}?token=${token}`
    );
    const statusData = await statusRes.json();
    const runStatus = statusData.data?.status;

    // Update live progress in scrape_runs
    if (scrapeRunId) {
      const itemCount = statusData.data?.stats?.itemCount ?? 0;
      const statusMsg = statusData.data?.statusMessage ?? null;
      await updateScrapeRun(scrapeRunId, {
        reviewsFound: itemCount,
        statusMessage: statusMsg,
      });
    }

    if (runStatus === "SUCCEEDED") break;
    if (runStatus === "FAILED" || runStatus === "ABORTED" || runStatus === "TIMED-OUT") {
      console.warn(`[scrape] Apify run ${runStatus}: ${statusData.data?.statusMessage || "unknown"}`);
      return { status: "failed", reviews: [] };
    }

    await new Promise((resolve) => setTimeout(resolve, 10_000));
  }

  // Fetch all reviews from the dataset (paginated)
  const reviews: Record<string, unknown>[] = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await fetch(
      `${APIFY_BASE_URL}/datasets/${datasetId}/items?token=${token}&limit=${limit}&offset=${offset}`
    );
    if (!res.ok) throw new Error(`Failed to fetch dataset: ${res.status}`);
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    reviews.push(...items);
    offset += items.length;
    if (items.length < limit) break;
  }

  return { status: "ok", reviews };
}

/**
 * Create an admin notification (persisted in DB for admin dashboard).
 */
async function createAdminNotification(
  type: string,
  title: string,
  message: string,
  hotelId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    await query(
      `INSERT INTO admin_notifications (type, title, message, hotel_id, metadata)
       VALUES ($1, $2, $3, $4, $5)`,
      [type, title, message, hotelId ?? null, JSON.stringify(metadata ?? {})]
    );
  } catch (err) {
    console.error("[scrape] Failed to create admin notification:", err);
  }
}

/**
 * Poll an Apify run until it finishes, then fetch the dataset and ingest reviews.
 *
 * For Booking.com: tries the primary actor (voyager — cheaper) first.
 * If it returns 0 reviews, automatically falls back to the fallback actor (plowdata — browser-based).
 * If both actors fail, creates an admin notification.
 */
export async function waitForScrapeAndIngest(
  hotelId: string,
  runId: string,
  datasetId: string,
  source: ReviewSource = "booking",
  pipelineMode: "full" | "incremental" | "none" = "full",
  batchId?: string
): Promise<{ fetched: number; inserted: number }> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) throw new Error("APIFY_API_TOKEN is not configured");

  const config = PLATFORM_CONFIG[source];
  let usedFallback = false;

  // Create scrape_runs record if batch coordination is active
  let scrapeRunId: string | undefined;
  if (batchId) {
    scrapeRunId = await createScrapeRun(hotelId, batchId, source, runId, datasetId);
  }

  // --- Step 1: Poll the primary actor run ---
  let result = await pollApifyRun(runId, datasetId, token, scrapeRunId);
  let allReviews = result.reviews;

  // --- Step 2: Booking.com fallback chain ---
  if (source === "booking" && allReviews.length === 0 && config.apifyFallbackActorId) {
    const fallbackActorId = config.apifyFallbackActorId;
    console.log(`[scrape] Primary actor returned 0 Booking reviews — trying fallback actor (${fallbackActorId})`);

    if (scrapeRunId) {
      await updateScrapeRun(scrapeRunId, { statusMessage: "Primary actor returned 0 reviews, trying fallback..." });
    }

    // Look up the hotel's booking URL for the fallback run
    const hotel = await queryOne<{ booking_url: string | null; name: string }>(
      "SELECT booking_url, name FROM hotels WHERE id = $1",
      [hotelId]
    );

    if (hotel?.booking_url) {
      try {
        const fallbackInput = buildActorInput(source, hotel.booking_url, 3000, fallbackActorId);
        const fallbackRun = await triggerActor(fallbackActorId, fallbackInput, token);
        console.log(`[scrape] Fallback run started: ${fallbackRun.runId}`);

        if (scrapeRunId) {
          await updateScrapeRun(scrapeRunId, {
            apifyRunId: fallbackRun.runId,
            datasetId: fallbackRun.datasetId,
            statusMessage: "Running fallback scraper...",
          });
        }

        const fallbackResult = await pollApifyRun(fallbackRun.runId, fallbackRun.datasetId, token, scrapeRunId);
        allReviews = fallbackResult.reviews;

        if (allReviews.length > 0) {
          usedFallback = true;
          console.log(`[scrape] Fallback actor fetched ${allReviews.length} Booking reviews`);
        }
      } catch (err) {
        console.error(`[scrape] Fallback actor failed:`, err);
      }
    }

    // --- Step 3: Both actors failed → admin notification ---
    if (allReviews.length === 0) {
      const hotelName = hotel?.name || hotelId;
      console.error(`[scrape] Both Apify actors failed for ${hotelName}. Creating admin notification.`);
      await createAdminNotification(
        "scrape_failure",
        "Booking.com scraping failed",
        `Both Apify actors (voyager and plowdata) returned 0 reviews for "${hotelName}". Booking.com may be blocking scraping for this property. Please check the hotel URL and try again manually.`,
        hotelId,
        { source, primaryActorId: config.apifyActorId, fallbackActorId: config.apifyFallbackActorId }
      );

      if (scrapeRunId) {
        await updateScrapeRun(scrapeRunId, {
          status: "failed",
          errorMessage: "Both Apify actors returned 0 reviews",
          completed: true,
        });
        await checkBatchCompletionAndTrigger(hotelId, batchId!, pipelineMode);
      }
      return { fetched: 0, inserted: 0 };
    }
  }

  // For non-booking platforms that failed
  if (allReviews.length === 0) {
    if (scrapeRunId) {
      await updateScrapeRun(scrapeRunId, {
        status: "failed",
        errorMessage: "Apify run returned 0 reviews",
        completed: true,
      });
      await checkBatchCompletionAndTrigger(hotelId, batchId!, pipelineMode);
    }
    return { fetched: 0, inserted: 0 };
  }

  // --- Ingest reviews ---
  if (scrapeRunId) {
    await updateScrapeRun(scrapeRunId, {
      status: "ingesting",
      reviewsFound: allReviews.length,
      statusMessage: "Inserting reviews into database...",
    });
  }

  const { normalizeBatchForPlatform } = await import("./normalize");
  const { insertReviews } = await import("./ingest");

  const normalized = normalizeBatchForPlatform(allReviews, source);
  const { count: inserted, insertedIds } = await insertReviews(hotelId, normalized);

  if (usedFallback) {
    console.log(`[scrape] Reviews ingested via fallback actor (plowdata) for hotel ${hotelId}`);
  }

  // Update hotel with external metadata from first review (Booking.com only)
  if (source === "booking") {
    const first = allReviews[0] as Record<string, unknown>;
    if (first.hotelId || first.hotelRating) {
      await queryOne(
        `UPDATE hotels SET external_hotel_id = COALESCE($1, external_hotel_id) WHERE id = $2 RETURNING id`,
        [first.hotelId ?? null, hotelId]
      );
    }
  }

  // Mark scrape as completed
  if (scrapeRunId) {
    await updateScrapeRun(scrapeRunId, {
      status: "completed",
      reviewsFound: allReviews.length,
      reviewsInserted: inserted,
      statusMessage: null,
      completed: true,
    });
  }

  // In-app notification for scrape completion
  if (inserted > 0) {
    try {
      await notifyHotelUsers(hotelId, {
        type: "scrape_complete",
        title: `${inserted} new ${source} reviews ingested`,
        message: `Scrape completed: ${inserted} new reviews from ${allReviews.length} total found.`,
        link: `/dashboard/${hotelId}`,
      });
    } catch {
      // non-critical
    }
  }

  // Pipeline trigger: batch-coordinated vs legacy
  if (batchId) {
    // Batch mode: only trigger pipeline when ALL scrapes in batch are done
    await checkBatchCompletionAndTrigger(hotelId, batchId, pipelineMode);
  } else if (inserted > 0 && pipelineMode !== "none") {
    // Legacy mode (scheduler, single scrape without batch): trigger immediately
    try {
      if (pipelineMode === "incremental") {
        const { runIncrementalPipeline } = await import("./pipeline");
        console.log(`Auto-running incremental pipeline for hotel ${hotelId} after ingesting ${inserted} ${source} reviews...`);
        await runIncrementalPipeline(hotelId);
        console.log(`Incremental pipeline completed for hotel ${hotelId}`);
      } else {
        const { runFullPipeline } = await import("./pipeline");
        console.log(`Auto-running pipeline for hotel ${hotelId} after ingesting ${inserted} ${source} reviews...`);
        await runFullPipeline(hotelId);
        console.log(`Pipeline completed for hotel ${hotelId}`);
      }
    } catch (err) {
      console.error(`Auto-pipeline failed for hotel ${hotelId}:`, err);
    }

    // Auto-respond to eligible new reviews (fire-and-forget)
    if (insertedIds.length > 0) {
      import("./auto-respond")
        .then(({ processAutoRespond }) => processAutoRespond(hotelId, insertedIds))
        .catch((err) => console.error(`Auto-respond failed for hotel ${hotelId}:`, err));
    }
  }

  return { fetched: allReviews.length, inserted };
}
