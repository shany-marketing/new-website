import pg from "pg";
import fs from "fs";
import crypto from "crypto";

const pool = new pg.Pool({ connectionString: "postgresql://postgres:a1212333@localhost:5432/upstar_dev" });
const HOTEL_ID = "710a17c1-b011-4167-a4d3-1a9cb1ef0b42";

// Load APIFY_API_TOKEN
let token = process.env.APIFY_API_TOKEN;
if (!token) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(/APIFY_API_TOKEN=(.+)/);
  if (match) token = match[1].trim();
}
if (!token) { console.error("No APIFY_API_TOKEN!"); process.exit(1); }

const RUNS = [
  { source: "booking",      runId: "SakCRgLcddXMVeXsb", datasetId: "qNUddErcicK1mIgIc" },
  { source: "google",       runId: "nIfUhiIwKh5x1qnLt", datasetId: "BYviGXfXAq45abreP" },
  { source: "expedia",      runId: "zCon6XqhQ4yGtcekJ", datasetId: "4N5zw9mOvzGJXohae" },
  { source: "tripadvisor",  runId: "7qSS1zMgUdOFGth2u", datasetId: "tnLbyHNbfdTxxRkRz" },
];

const BASE = "https://api.apify.com/v2";

// ---- Helpers ----

function hashPII(value) {
  return crypto.createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function cleanGuestName(name) {
  if (!name) return null;
  const trimmed = name.trim();
  if (!trimmed) return null;
  // Return first name only
  return trimmed.split(/\s+/)[0];
}

// ---- Normalizers ----

function normalizeBooking(raw) {
  if (!raw.id) return null;
  return {
    source: "booking",
    externalId: String(raw.id),
    checkInDate: raw.checkInDate ?? null,
    checkOutDate: raw.checkOutDate ?? null,
    likedText: raw.likedText?.trim() || null,
    dislikedText: raw.dislikedText?.trim() || null,
    numberOfNights: raw.numberOfNights ?? null,
    rating: raw.rating ?? null,
    reviewDate: raw.reviewDate ?? null,
    reviewTitle: raw.reviewTitle?.trim() || null,
    roomInfo: raw.roomInfo?.trim() || null,
    travelerType: raw.travelerType?.trim() || null,
    userLocation: raw.userLocation?.trim() || null,
    userNameHash: raw.userName ? hashPII(raw.userName) : hashPII("anonymous"),
    reviewerDisplayName: cleanGuestName(raw.userName),
    reviewLanguage: raw.reviewLanguage?.trim() || null,
    helpfulVotes: raw.helpfulVotes ?? null,
    propertyResponse: raw.propertyResponse?.trim() || null,
    stayRoomId: raw.stayRoomId ?? null,
    hotelRating: raw.hotelRating ?? null,
    hotelRatingLabel: raw.hotelRatingLabel?.trim() || null,
    hotelReviewsCount: raw.hotelReviews ?? null,
    hotelRatingScores: raw.hotelRatingScores ?? null,
  };
}

function normalizeGoogle(raw) {
  if (!raw.reviewId) return null;
  return {
    source: "google",
    externalId: String(raw.reviewId),
    checkInDate: null, checkOutDate: null,
    likedText: raw.text?.trim() || raw.textTranslated?.trim() || null,
    dislikedText: null,
    numberOfNights: null,
    rating: raw.stars != null ? raw.stars * 2 : null,
    reviewDate: raw.publishedAtDate ?? raw.publishedAt ?? null,
    reviewTitle: null,
    roomInfo: null,
    travelerType: null,
    userLocation: null,
    userNameHash: raw.name ? hashPII(raw.name) : hashPII("anonymous"),
    reviewerDisplayName: cleanGuestName(raw.name),
    reviewLanguage: raw.language ?? null,
    helpfulVotes: raw.likesCount ?? null,
    propertyResponse: raw.responseFromOwnerText?.trim() || null,
    stayRoomId: null, hotelRating: null, hotelRatingLabel: null,
    hotelReviewsCount: null, hotelRatingScores: null,
  };
}

function normalizeExpedia(raw) {
  if (!raw.id) return null;
  let rating = null;
  const scoreVal = raw.reviewScoreWithDescription?.value;
  if (scoreVal != null) {
    const parsed = typeof scoreVal === "number" ? scoreVal : parseFloat(String(scoreVal));
    if (!isNaN(parsed)) rating = parsed <= 5 ? parsed * 2 : parsed;
  }
  const authorName = raw.reviewAuthorAttribution?.text || raw.userNickname;
  const reviewDate = typeof raw.submissionTime === "string"
    ? raw.submissionTime
    : raw.submissionTime?.longDateFormat ?? null;
  return {
    source: "expedia",
    externalId: String(raw.id),
    checkInDate: null, checkOutDate: null,
    likedText: raw.text?.trim() || null,
    dislikedText: null,
    numberOfNights: null,
    rating,
    reviewDate,
    reviewTitle: raw.title?.trim() || null,
    roomInfo: null,
    travelerType: raw.travelers?.trim() || null,
    userLocation: null,
    userNameHash: authorName ? hashPII(authorName) : hashPII("anonymous"),
    reviewerDisplayName: cleanGuestName(authorName),
    reviewLanguage: raw.locale ?? null,
    helpfulVotes: null,
    propertyResponse: raw.managementResponses?.[0]?.text?.trim() || null,
    stayRoomId: null, hotelRating: null, hotelRatingLabel: null,
    hotelReviewsCount: null, hotelRatingScores: null,
  };
}

function normalizeTripAdvisor(raw) {
  if (!raw.id) return null;
  return {
    source: "tripadvisor",
    externalId: String(raw.id),
    checkInDate: null, checkOutDate: null,
    likedText: raw.text?.trim() || null,
    dislikedText: null,
    numberOfNights: null,
    rating: raw.rating != null ? raw.rating * 2 : null,
    reviewDate: raw.publishedDate ?? null,
    reviewTitle: raw.title?.trim() || null,
    roomInfo: raw.roomTip?.trim() || null,
    travelerType: raw.tripType?.trim() || null,
    userLocation: raw.userLocation?.name?.trim() || null,
    userNameHash: raw.user?.username ? hashPII(raw.user.username) : hashPII("anonymous"),
    reviewerDisplayName: cleanGuestName(raw.user?.username),
    reviewLanguage: raw.language ?? null,
    helpfulVotes: raw.helpfulVotes ?? null,
    propertyResponse: raw.ownerResponse?.text?.trim() || null,
    stayRoomId: null, hotelRating: null, hotelRatingLabel: null,
    hotelReviewsCount: null, hotelRatingScores: null,
  };
}

const NORMALIZERS = { booking: normalizeBooking, google: normalizeGoogle, expedia: normalizeExpedia, tripadvisor: normalizeTripAdvisor };

// ---- Insert reviews ----

async function insertReviews(hotelId, reviews) {
  let inserted = 0;
  for (const r of reviews) {
    try {
      const res = await pool.query(
        `INSERT INTO raw_reviews (
          hotel_id, source, external_id, check_in_date, check_out_date,
          liked_text, disliked_text, number_of_nights, rating, review_date,
          review_title, room_info, traveler_type, user_location,
          user_name_hash, reviewer_display_name,
          review_language, helpful_votes, property_response,
          stay_room_id, hotel_rating, hotel_rating_label,
          hotel_reviews_count, hotel_rating_scores
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24
        ) ON CONFLICT (source, external_id) DO NOTHING
        RETURNING id`,
        [
          hotelId, r.source, r.externalId, r.checkInDate, r.checkOutDate,
          r.likedText, r.dislikedText, r.numberOfNights, r.rating, r.reviewDate,
          r.reviewTitle, r.roomInfo, r.travelerType, r.userLocation,
          r.userNameHash, r.reviewerDisplayName,
          r.reviewLanguage, r.helpfulVotes, r.propertyResponse,
          r.stayRoomId, r.hotelRating, r.hotelRatingLabel,
          r.hotelReviewsCount, r.hotelRatingScores ? JSON.stringify(r.hotelRatingScores) : null,
        ]
      );
      if (res.rowCount > 0) inserted++;
    } catch (err) {
      // Skip duplicates or errors silently
    }
  }
  return inserted;
}

// ---- Poll & Ingest ----

async function pollAndIngest(run) {
  const { source, runId, datasetId } = run;
  console.log(`\n[${source}] Polling run ${runId}...`);

  // Poll until done (max 30 min)
  for (let i = 0; i < 180; i++) {
    const res = await fetch(`${BASE}/actor-runs/${runId}?token=${token}`);
    const data = await res.json();
    const status = data.data?.status;

    if (status === "SUCCEEDED") {
      console.log(`[${source}] Scrape SUCCEEDED`);
      break;
    }
    if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
      console.error(`[${source}] Scrape ${status}: ${data.data?.statusMessage || "unknown"}`);
      return { source, fetched: 0, inserted: 0, status };
    }

    // Log progress every 30 seconds
    if (i % 3 === 0) {
      console.log(`[${source}] Status: ${status} (${(i * 10)}s elapsed)`);
    }
    await new Promise(r => setTimeout(r, 10_000));
  }

  // Fetch dataset
  let allReviews = [];
  let offset = 0;
  const limit = 1000;

  while (true) {
    const res = await fetch(`${BASE}/datasets/${datasetId}/items?token=${token}&limit=${limit}&offset=${offset}`);
    if (!res.ok) { console.error(`[${source}] Failed to fetch dataset: ${res.status}`); break; }
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    allReviews = allReviews.concat(items);
    offset += items.length;
    if (items.length < limit) break;
  }

  console.log(`[${source}] Fetched ${allReviews.length} raw reviews`);

  if (allReviews.length === 0) {
    return { source, fetched: 0, inserted: 0, status: "empty" };
  }

  // Normalize
  const normalize = NORMALIZERS[source];
  const normalized = allReviews.map(r => normalize(r)).filter(Boolean);
  console.log(`[${source}] Normalized ${normalized.length} reviews`);

  // Insert
  const inserted = await insertReviews(HOTEL_ID, normalized);
  console.log(`[${source}] Inserted ${inserted} new reviews (${normalized.length - inserted} duplicates skipped)`);

  return { source, fetched: allReviews.length, inserted, status: "done" };
}

// ---- Main ----

console.log("=== Wyndham Grand Costa del Sol — Poll & Ingest ===\n");

// Run all polls in parallel
const results = await Promise.all(RUNS.map(run => pollAndIngest(run)));

console.log("\n=== Summary ===");
let totalInserted = 0;
for (const r of results) {
  console.log(`  ${r.source}: ${r.fetched} fetched, ${r.inserted} inserted (${r.status})`);
  totalInserted += r.inserted;
}

// Show total reviews in DB now
const { rows: countRows } = await pool.query(
  "SELECT source, COUNT(*) as count FROM raw_reviews WHERE hotel_id = $1 GROUP BY source ORDER BY source",
  [HOTEL_ID]
);
console.log("\n=== Reviews in DB ===");
for (const row of countRows) {
  console.log(`  ${row.source}: ${row.count}`);
}

await pool.end();
console.log("\nDone! Total new reviews inserted:", totalInserted);
