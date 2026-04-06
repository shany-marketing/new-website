import pg from "pg";
import fs from "fs";
import crypto from "crypto";

const pool = new pg.Pool({ connectionString: "postgresql://postgres:a1212333@localhost:5432/upstar_dev" });
const HOTEL_ID = "710a17c1-b011-4167-a4d3-1a9cb1ef0b42";

let token = process.env.APIFY_API_TOKEN;
if (!token) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(/APIFY_API_TOKEN=(.+)/);
  if (match) token = match[1].trim();
}

const RUN_ID = "0mUrAPMFm1qRTiHGh";
const DATASET_ID = "jx5FNReSfVmXX2G9u";
const BASE = "https://api.apify.com/v2";

function hashPII(v) { return crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex"); }
function cleanName(n) { return n?.trim()?.split(/\s+/)[0] || null; }

// Poll
console.log("Polling Booking run...");
for (let i = 0; i < 180; i++) {
  const res = await fetch(`${BASE}/actor-runs/${RUN_ID}?token=${token}`);
  const data = await res.json();
  const status = data.data?.status;
  if (status === "SUCCEEDED") { console.log("SUCCEEDED!"); break; }
  if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
    console.error(`FAILED: ${status} — ${data.data?.statusMessage}`);
    await pool.end();
    process.exit(1);
  }
  if (i % 3 === 0) console.log(`  Status: ${status} (${i * 10}s)`);
  await new Promise(r => setTimeout(r, 10_000));
}

// Fetch dataset
let all = [], offset = 0;
while (true) {
  const res = await fetch(`${BASE}/datasets/${DATASET_ID}/items?token=${token}&limit=1000&offset=${offset}`);
  const items = await res.json();
  if (!Array.isArray(items) || items.length === 0) break;
  all = all.concat(items);
  offset += items.length;
  if (items.length < 1000) break;
}
console.log(`Fetched ${all.length} Booking reviews`);

if (all.length === 0) { console.log("No reviews found"); await pool.end(); process.exit(0); }

// Normalize & insert
let inserted = 0;
for (const raw of all) {
  if (!raw.id) continue;
  const r = {
    source: "booking", externalId: String(raw.id),
    checkInDate: raw.checkInDate ?? null, checkOutDate: raw.checkOutDate ?? null,
    likedText: raw.likedText?.trim() || null, dislikedText: raw.dislikedText?.trim() || null,
    numberOfNights: raw.numberOfNights ?? null, rating: raw.rating ?? null,
    reviewDate: raw.reviewDate ?? null, reviewTitle: raw.reviewTitle?.trim() || null,
    roomInfo: raw.roomInfo?.trim() || null, travelerType: raw.travelerType?.trim() || null,
    userLocation: raw.userLocation?.trim() || null,
    userNameHash: raw.userName ? hashPII(raw.userName) : hashPII("anonymous"),
    reviewerDisplayName: cleanName(raw.userName),
    reviewLanguage: raw.reviewLanguage?.trim() || null, helpfulVotes: raw.helpfulVotes ?? null,
    propertyResponse: raw.propertyResponse?.trim() || null, stayRoomId: raw.stayRoomId ?? null,
    hotelRating: raw.hotelRating ?? null, hotelRatingLabel: raw.hotelRatingLabel?.trim() || null,
    hotelReviewsCount: raw.hotelReviews ?? null, hotelRatingScores: raw.hotelRatingScores ?? null,
  };
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
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      ON CONFLICT (source, external_id) DO NOTHING RETURNING id`,
      [
        HOTEL_ID, r.source, r.externalId, r.checkInDate, r.checkOutDate,
        r.likedText, r.dislikedText, r.numberOfNights, r.rating, r.reviewDate,
        r.reviewTitle, r.roomInfo, r.travelerType, r.userLocation,
        r.userNameHash, r.reviewerDisplayName,
        r.reviewLanguage, r.helpfulVotes, r.propertyResponse,
        r.stayRoomId, r.hotelRating, r.hotelRatingLabel,
        r.hotelReviewsCount, r.hotelRatingScores ? JSON.stringify(r.hotelRatingScores) : null,
      ]
    );
    if (res.rowCount > 0) inserted++;
  } catch {}
}
console.log(`Inserted ${inserted} Booking reviews`);

// Final
const { rows } = await pool.query(
  "SELECT source, COUNT(*) as count FROM raw_reviews WHERE hotel_id = $1 GROUP BY source ORDER BY source",
  [HOTEL_ID]
);
console.log("\n=== Wyndham Reviews in DB ===");
let total = 0;
for (const row of rows) { console.log(`  ${row.source}: ${row.count}`); total += parseInt(row.count); }
console.log(`  TOTAL: ${total}`);
await pool.end();
