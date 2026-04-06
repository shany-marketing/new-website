import { query, queryOne } from './db';
import { NormalizedReview } from './normalize';

/**
 * Insert a batch of normalized reviews into the database.
 * Uses ON CONFLICT to skip duplicates (idempotent).
 * Returns the count and IDs of newly inserted reviews.
 */
export async function insertReviews(
  hotelId: string,
  reviews: NormalizedReview[]
): Promise<{ count: number; insertedIds: string[] }> {
  let inserted = 0;
  const insertedIds: string[] = [];

  // Filter out reviews older than 1 year
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const filtered = reviews.filter((r) => {
    if (!r.reviewDate) return true; // keep reviews without dates
    const d = new Date(r.reviewDate);
    return d >= oneYearAgo;
  });

  if (filtered.length < reviews.length) {
    console.log(`[ingest] Filtered out ${reviews.length - filtered.length} reviews older than 1 year (kept ${filtered.length})`);
  }

  for (const r of filtered) {
    const result = await query(
      `INSERT INTO raw_reviews (
        hotel_id, external_id, source, check_in_date, check_out_date,
        liked_text, disliked_text, number_of_nights, rating,
        review_date, review_title, room_info, traveler_type,
        user_location, user_name_hash,
        review_language, helpful_votes, property_response, stay_room_id,
        hotel_rating, hotel_rating_label, hotel_reviews_count, hotel_rating_scores,
        reviewer_display_name
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      ON CONFLICT (source, external_id) DO UPDATE SET
        reviewer_display_name = COALESCE(EXCLUDED.reviewer_display_name, raw_reviews.reviewer_display_name),
        user_location = COALESCE(EXCLUDED.user_location, raw_reviews.user_location),
        property_response = COALESCE(EXCLUDED.property_response, raw_reviews.property_response)
      RETURNING id`,
      [
        hotelId,
        r.externalId,
        r.source,
        r.checkInDate,
        r.checkOutDate,
        r.likedText,
        r.dislikedText,
        r.numberOfNights,
        r.rating,
        r.reviewDate,
        r.reviewTitle,
        r.roomInfo,
        r.travelerType,
        r.userLocation,
        r.userNameHash,
        r.reviewLanguage,
        r.helpfulVotes,
        r.propertyResponse,
        r.stayRoomId,
        r.hotelRating,
        r.hotelRatingLabel,
        r.hotelReviewsCount,
        r.hotelRatingScores ? JSON.stringify(r.hotelRatingScores) : null,
        r.reviewerDisplayName,
      ]
    );
    if (result.length > 0) {
      inserted++;
      insertedIds.push((result[0] as { id: string }).id);
    }
  }

  // Update ingestion cursor (per hotel + platform)
  if (reviews.length > 0) {
    const last = reviews[reviews.length - 1];
    await query(
      `INSERT INTO ingestion_cursors (hotel_id, source, last_review_id, last_review_date, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (hotel_id, source) DO UPDATE SET
         last_review_id = EXCLUDED.last_review_id,
         last_review_date = EXCLUDED.last_review_date,
         updated_at = NOW()`,
      [hotelId, last.source, last.externalId, last.reviewDate]
    );
  }

  return { count: inserted, insertedIds };
}

/**
 * Get or create a hotel by booking URL.
 */
export async function getOrCreateHotel(
  name: string,
  bookingUrl: string
): Promise<string> {
  const existing = await queryOne<{ id: string }>(
    'SELECT id FROM hotels WHERE booking_url = $1',
    [bookingUrl]
  );
  if (existing) return existing.id;

  const created = await queryOne<{ id: string }>(
    'INSERT INTO hotels (name, booking_url) VALUES ($1, $2) RETURNING id',
    [name, bookingUrl]
  );
  return created!.id;
}
