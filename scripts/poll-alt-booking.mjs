import fs from "fs";
import pg from "pg";
import crypto from "crypto";

let token;
const envContent = fs.readFileSync(".env.local", "utf8");
const match = envContent.match(/APIFY_API_TOKEN=(.+)/);
if (match) token = match[1].trim();

const BASE = "https://api.apify.com/v2";
const RUN_ID = "bldMn27JxDQ8h6uSH";
const DATASET_ID = "TCj5JuN2P9rIdo5QQ";
const HOTEL_ID = "710a17c1-b011-4167-a4d3-1a9cb1ef0b42";

// Poll
console.log("Polling alt Booking scraper...");
for (let i = 0; i < 180; i++) {
  const res = await fetch(`${BASE}/actor-runs/${RUN_ID}?token=${token}`);
  const data = await res.json();
  const status = data.data?.status;
  if (status === "SUCCEEDED") { console.log(`SUCCEEDED at ${i * 10}s`); break; }
  if (status === "FAILED" || status === "ABORTED" || status === "TIMED-OUT") {
    console.error(`${status}: ${data.data?.statusMessage}`);
    process.exit(1);
  }
  if (i % 6 === 0) console.log(`  ${status} (${i * 10}s)`);
  await new Promise(r => setTimeout(r, 10000));
}

// Fetch all
let all = [], offset = 0;
while (true) {
  const res = await fetch(`${BASE}/datasets/${DATASET_ID}/items?token=${token}&limit=1000&offset=${offset}`);
  const items = await res.json();
  if (!Array.isArray(items) || items.length === 0) break;
  all = all.concat(items);
  offset += items.length;
  if (items.length < 1000) break;
}
console.log(`Fetched ${all.length} reviews`);
if (all.length === 0) { console.log("Empty!"); process.exit(0); }

// Show sample to understand format
console.log("\nSample review keys:", Object.keys(all[0]).join(", "));
console.log("Sample:", JSON.stringify(all[0], null, 2).slice(0, 1500));

// Try to map to our schema - this actor may use different field names
function hashPII(v) { return crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex"); }
function cleanName(n) { return n?.trim()?.split(/\s+/)[0] || null; }

const pool = new pg.Pool({ connectionString: "postgresql://postgres:a1212333@localhost:5432/upstar_dev" });

let inserted = 0, skipped = 0;
for (const raw of all) {
  // Try common field name patterns
  const externalId = String(raw.id || raw.reviewId || raw.review_id || "");
  if (!externalId) { skipped++; continue; }

  const likedText = raw.likedText || raw.positive || raw.pros || raw.liked || null;
  const dislikedText = raw.dislikedText || raw.negative || raw.cons || raw.disliked || null;
  const rating = raw.rating || raw.score || raw.reviewScore || null;
  const reviewDate = raw.reviewDate || raw.date || raw.createdAt || null;
  const userName = raw.userName || raw.reviewer || raw.author || raw.name || null;
  const travelerType = raw.travelerType || raw.travellerType || raw.guestType || null;
  const userLocation = raw.userLocation || raw.country || raw.location || null;
  const roomInfo = raw.roomInfo || raw.room || raw.roomType || null;
  const reviewTitle = raw.reviewTitle || raw.title || null;
  const numberOfNights = raw.numberOfNights || raw.nights || null;
  const reviewLanguage = raw.reviewLanguage || raw.language || null;
  const propertyResponse = raw.propertyResponse || raw.hotelResponse || raw.response || null;

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
        HOTEL_ID, "booking", externalId, raw.checkInDate ?? null, raw.checkOutDate ?? null,
        likedText?.trim?.() || null, dislikedText?.trim?.() || null, numberOfNights, rating, reviewDate,
        reviewTitle?.trim?.() || null, roomInfo?.trim?.() || null, travelerType?.trim?.() || null, userLocation?.trim?.() || null,
        userName ? hashPII(userName) : hashPII("anonymous"), cleanName(userName),
        reviewLanguage?.trim?.() || null, raw.helpfulVotes ?? null, propertyResponse?.trim?.() || null,
        raw.stayRoomId ?? null, raw.hotelRating ?? null, raw.hotelRatingLabel?.trim?.() || null,
        raw.hotelReviews ?? null, raw.hotelRatingScores ? JSON.stringify(raw.hotelRatingScores) : null,
      ]
    );
    if (res.rowCount > 0) inserted++;
  } catch (err) {
    if (skipped < 3) console.error("Insert error:", err.message);
    skipped++;
  }
}
console.log(`\nInserted ${inserted}, skipped ${skipped}`);

const { rows } = await pool.query(
  "SELECT source, COUNT(*) as count FROM raw_reviews WHERE hotel_id = $1 GROUP BY source ORDER BY source",
  [HOTEL_ID]
);
console.log("\n=== Wyndham Reviews ===");
let total = 0;
for (const row of rows) { console.log(`  ${row.source}: ${row.count}`); total += parseInt(row.count); }
console.log(`  TOTAL: ${total}`);
await pool.end();
