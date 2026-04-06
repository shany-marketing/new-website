import fs from "fs";
import pg from "pg";
import crypto from "crypto";

let token;
const envContent = fs.readFileSync(".env.local", "utf8");
const m = envContent.match(/APIFY_API_TOKEN=(.+)/);
if (m) token = m[1].trim();

const BASE = "https://api.apify.com/v2";
const RUN_ID = "xb1XlpJF0NhvVF7En";
const DATASET_ID = "6AeVF9dOfqwhZoDj6";
const HOTEL_ID = "710a17c1-b011-4167-a4d3-1a9cb1ef0b42";

function hashPII(v) { return crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex"); }
function cleanName(n) { return n?.trim()?.split(/\s+/)[0] || null; }

// Generate a deterministic external ID from review content
function makeExternalId(raw) {
  const key = [raw.guestUsername || "", raw.reviewDate || "", raw.title || "", raw.positiveText?.slice(0, 50) || ""].join("|");
  return "bk_" + crypto.createHash("sha256").update(key).digest("hex").slice(0, 16);
}

// Poll
console.log("Polling alt Booking scraper (5000 limit)...");
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

// Map agenscrape fields → our schema
const pool = new pg.Pool({ connectionString: "postgresql://postgres:a1212333@localhost:5432/upstar_dev" });
let inserted = 0, errors = 0;

for (const raw of all) {
  const externalId = makeExternalId(raw);
  const userName = raw.guestUsername || null;

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
        HOTEL_ID,
        "booking",
        externalId,
        null,                                          // check_in_date
        null,                                          // check_out_date
        raw.positiveText?.trim() || null,              // liked_text
        raw.negativeText?.trim() || null,              // disliked_text
        raw.numNights ?? null,                         // number_of_nights
        raw.reviewScore ?? null,                       // rating (already 1-10 scale)
        raw.reviewDate ?? null,                        // review_date
        raw.title?.trim() || null,                     // review_title
        raw.roomType?.trim() || null,                  // room_info
        raw.guestType?.trim() || null,                 // traveler_type
        raw.guestCountry?.trim() || null,              // user_location
        userName ? hashPII(userName) : hashPII("anonymous"),
        cleanName(userName),
        raw.language?.trim() || null,                  // review_language
        null,                                          // helpful_votes
        null,                                          // property_response
        null, null, null, null, null,                  // hotel meta fields
      ]
    );
    if (res.rowCount > 0) inserted++;
  } catch (err) {
    errors++;
    if (errors <= 3) console.error("Insert error:", err.message);
  }
}
console.log(`Inserted ${inserted}, errors ${errors}`);

const { rows } = await pool.query(
  "SELECT source, COUNT(*) as count FROM raw_reviews WHERE hotel_id = $1 GROUP BY source ORDER BY source",
  [HOTEL_ID]
);
console.log("\n=== Wyndham Reviews ===");
let total = 0;
for (const row of rows) { console.log(`  ${row.source}: ${row.count}`); total += parseInt(row.count); }
console.log(`  TOTAL: ${total}`);
await pool.end();
