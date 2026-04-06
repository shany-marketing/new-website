import { query, queryOne } from "./db";
import { PLATFORM_CONFIG } from "@/types/platform";
import type { ReviewSource } from "@/types/platform";

export interface AutoRespondSettings {
  id: string;
  hotelId: string;
  enabled: boolean;
  minRating: number;
  skipWithComplaints: boolean;
  autoPost: boolean;
  platforms: string[];
  maxPerRun: number;
}

interface AutoRespondReview {
  id: string;
  source: ReviewSource;
  rating: number | null;
  liked_text: string | null;
  disliked_text: string | null;
  review_title: string | null;
  reviewer_display_name: string | null;
  review_language: string | null;
  ai_response: string | null;
}

export async function getAutoRespondSettings(hotelId: string): Promise<AutoRespondSettings | null> {
  const row = await queryOne<{
    id: string;
    hotel_id: string;
    enabled: boolean;
    min_rating: number;
    skip_with_complaints: boolean;
    auto_post: boolean;
    platforms: string[];
    max_per_run: number;
  }>(
    "SELECT id, hotel_id, enabled, min_rating, skip_with_complaints, auto_post, platforms, max_per_run FROM auto_respond_settings WHERE hotel_id = $1",
    [hotelId]
  );
  if (!row) return null;
  return {
    id: row.id,
    hotelId: row.hotel_id,
    enabled: row.enabled,
    minRating: Number(row.min_rating),
    skipWithComplaints: row.skip_with_complaints,
    autoPost: row.auto_post,
    platforms: row.platforms,
    maxPerRun: row.max_per_run,
  };
}

export async function saveAutoRespondSettings(
  hotelId: string,
  settings: Partial<Omit<AutoRespondSettings, "id" | "hotelId">>
): Promise<void> {
  await query(
    `INSERT INTO auto_respond_settings (hotel_id, enabled, min_rating, skip_with_complaints, auto_post, platforms, max_per_run)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     ON CONFLICT (hotel_id) DO UPDATE SET
       enabled = COALESCE($2, auto_respond_settings.enabled),
       min_rating = COALESCE($3, auto_respond_settings.min_rating),
       skip_with_complaints = COALESCE($4, auto_respond_settings.skip_with_complaints),
       auto_post = COALESCE($5, auto_respond_settings.auto_post),
       platforms = COALESCE($6, auto_respond_settings.platforms),
       max_per_run = COALESCE($7, auto_respond_settings.max_per_run),
       updated_at = NOW()`,
    [
      hotelId,
      settings.enabled ?? false,
      settings.minRating ?? 8.0,
      settings.skipWithComplaints ?? true,
      settings.autoPost ?? false,
      settings.platforms ?? ["booking"],
      settings.maxPerRun ?? 10,
    ]
  );
}

/**
 * Check whether a review is eligible for auto-respond.
 */
function shouldAutoRespond(
  review: AutoRespondReview,
  settings: AutoRespondSettings
): { eligible: boolean; skipReason?: string } {
  if (!settings.enabled) return { eligible: false, skipReason: "auto-respond disabled" };

  // Already has a response
  if (review.ai_response) return { eligible: false, skipReason: "already has response" };

  // Platform not in settings
  if (!settings.platforms.includes(review.source)) {
    return { eligible: false, skipReason: `platform ${review.source} not enabled` };
  }

  // Rating check — normalize to 10-scale
  if (review.rating != null) {
    const scale = PLATFORM_CONFIG[review.source]?.ratingScale || 10;
    const normalized = (review.rating / scale) * 10;
    if (normalized < settings.minRating) {
      return { eligible: false, skipReason: `rating ${normalized.toFixed(1)} below min ${settings.minRating}` };
    }
  }

  // Skip reviews with complaints
  if (settings.skipWithComplaints && review.disliked_text && review.disliked_text.trim().length > 0) {
    return { eligible: false, skipReason: "has complaints" };
  }

  return { eligible: true };
}

async function logAction(
  hotelId: string,
  reviewId: string,
  action: "generated" | "posted" | "skipped" | "failed",
  skipReason?: string,
  errorMessage?: string
): Promise<void> {
  await query(
    "INSERT INTO auto_respond_log (hotel_id, review_id, action, skip_reason, error_message) VALUES ($1, $2, $3, $4, $5)",
    [hotelId, reviewId, action, skipReason || null, errorMessage || null]
  );
}

/**
 * Process auto-respond for newly inserted reviews.
 * Called after scrape ingestion completes.
 */
export async function processAutoRespond(hotelId: string, reviewIds: string[]): Promise<void> {
  const settings = await getAutoRespondSettings(hotelId);
  if (!settings || !settings.enabled) return;

  // Fetch the reviews
  const reviews = await query<AutoRespondReview>(
    `SELECT id, source, rating, liked_text, disliked_text, review_title, reviewer_display_name, review_language, ai_response
     FROM raw_reviews WHERE id = ANY($1)`,
    [reviewIds]
  );

  let generated = 0;

  for (const review of reviews) {
    if (generated >= settings.maxPerRun) break;

    const { eligible, skipReason } = shouldAutoRespond(review, settings);
    if (!eligible) {
      await logAction(hotelId, review.id, "skipped", skipReason);
      continue;
    }

    try {
      // Lazy import to avoid circular deps
      const { generateAIResponse, getResponseSettings, getRelevantStaffActions, incrementUsage } = await import("./response-generator");
      const responseSettings = await getResponseSettings(hotelId);
      const staffActions = await getRelevantStaffActions(hotelId, review.id);

      await generateAIResponse(
        {
          id: review.id,
          likedText: review.liked_text,
          dislikedText: review.disliked_text,
          reviewTitle: review.review_title,
          rating: review.rating,
          reviewerDisplayName: review.reviewer_display_name,
          reviewLanguage: review.review_language,
        },
        responseSettings,
        undefined,
        staffActions
      );

      await incrementUsage(hotelId);
      await logAction(hotelId, review.id, "generated");
      generated++;

      console.log(`[auto-respond] Generated response for review ${review.id} (hotel ${hotelId})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[auto-respond] Failed for review ${review.id}:`, msg);
      await logAction(hotelId, review.id, "failed", undefined, msg);
    }
  }

  console.log(`[auto-respond] Hotel ${hotelId}: processed ${reviews.length} reviews, generated ${generated} responses`);
}

/**
 * Run auto-respond on existing unresponded reviews (manual trigger).
 * Finds eligible reviews that don't have an AI response yet.
 */
export async function runAutoRespondNow(hotelId: string): Promise<{ processed: number; generated: number; skipped: number }> {
  const settings = await getAutoRespondSettings(hotelId);
  if (!settings || !settings.enabled) {
    return { processed: 0, generated: 0, skipped: 0 };
  }

  // Find unresponded reviews matching the platform filter
  const reviews = await query<AutoRespondReview>(
    `SELECT id, source, rating, liked_text, disliked_text, review_title, reviewer_display_name, review_language, ai_response
     FROM raw_reviews
     WHERE hotel_id = $1 AND ai_response IS NULL AND source = ANY($2)
     ORDER BY review_date DESC
     LIMIT $3`,
    [hotelId, settings.platforms, settings.maxPerRun]
  );

  let generated = 0;
  let skipped = 0;

  for (const review of reviews) {
    const { eligible, skipReason } = shouldAutoRespond(review, settings);
    if (!eligible) {
      await logAction(hotelId, review.id, "skipped", skipReason);
      skipped++;
      continue;
    }

    try {
      const { generateAIResponse, getResponseSettings, getRelevantStaffActions, incrementUsage } = await import("./response-generator");
      const responseSettings = await getResponseSettings(hotelId);
      const staffActions = await getRelevantStaffActions(hotelId, review.id);

      await generateAIResponse(
        {
          id: review.id,
          likedText: review.liked_text,
          dislikedText: review.disliked_text,
          reviewTitle: review.review_title,
          rating: review.rating,
          reviewerDisplayName: review.reviewer_display_name,
          reviewLanguage: review.review_language,
        },
        responseSettings,
        undefined,
        staffActions
      );

      await incrementUsage(hotelId);
      await logAction(hotelId, review.id, "generated");
      generated++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[auto-respond] Failed for review ${review.id}:`, msg);
      await logAction(hotelId, review.id, "failed", undefined, msg);
    }
  }

  return { processed: reviews.length, generated, skipped };
}

/**
 * Get recent auto-respond log entries for a hotel.
 */
export async function getAutoRespondLog(
  hotelId: string,
  limit: number = 20
): Promise<{
  id: string;
  reviewId: string;
  action: string;
  skipReason: string | null;
  errorMessage: string | null;
  createdAt: string;
}[]> {
  const rows = await query<{
    id: string;
    review_id: string;
    action: string;
    skip_reason: string | null;
    error_message: string | null;
    created_at: string;
  }>(
    "SELECT id, review_id, action, skip_reason, error_message, created_at FROM auto_respond_log WHERE hotel_id = $1 ORDER BY created_at DESC LIMIT $2",
    [hotelId, limit]
  );
  return rows.map((r) => ({
    id: r.id,
    reviewId: r.review_id,
    action: r.action,
    skipReason: r.skip_reason,
    errorMessage: r.error_message,
    createdAt: r.created_at,
  }));
}
