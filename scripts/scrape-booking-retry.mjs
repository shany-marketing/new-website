/**
 * Re-trigger Booking.com scrapes for 7 hotels with corrected URLs.
 * Skips "Ramada Hotel & Suites Costa del Sol" = same as existing "Club La Costa World".
 * Writes to both local + RDS.
 */
import pg from "pg";
import fs from "fs";
import { createHash } from "crypto";
const { Pool } = pg;

const LOCAL_CONN = "postgresql://postgres:a1212333@localhost:5432/upstar_dev";
const RDS_CONN = "postgresql://upstar_admin:UpstarDb2026prod@upstar-db.clkosa6g6yx7.eu-west-1.rds.amazonaws.com:5432/upstar";
function makePool(c) { const r = c.includes("rds.amazonaws.com"); return new Pool({ connectionString: c.replace(/[?&]sslmode=[^&]*/g,""), ssl: r ? { rejectUnauthorized: false } : false }); }
const localPool = makePool(LOCAL_CONN);
const rdsPool = makePool(RDS_CONN);
const pools = [{ name: "local", pool: localPool }, { name: "RDS", pool: rdsPool }];

let TOKEN = process.env.APIFY_API_TOKEN;
if (!TOKEN) { const m = fs.readFileSync(".env.local","utf8").match(/APIFY_API_TOKEN=(.+)/); if (m) TOKEN = m[1].trim(); }
if (!TOKEN) { console.error("No token"); process.exit(1); }
const BASE = "https://api.apify.com/v2";
const ACTOR = "voyager~booking-reviews-scraper";
const MAX = 10000;

const HOTELS = [
  { id: "d716b6ab-e03f-40ae-ad2f-9c9886ba3038", name: "Encantada Resort", url: "https://www.booking.com/hotel/us/kissimmee-3070-secret-lake-drive.html" },
  // Skip Ramada Hotel & Suites Costa del Sol — same as Club La Costa World
  { id: "710a17c1-b011-4167-a4d3-1a9cb1ef0b42", name: "Wyndham Grand Costa del Sol", url: "https://www.booking.com/hotel/es/wyndham-grand-residences-costa-del-sol-mijas.html" },
  { id: "5168a38e-1df7-40b9-a83a-bddf7dc7810f", name: "Wyndham Duchally", url: "https://www.booking.com/hotel/gb/duchally-country-estate.html" },
  { id: "12c93170-4dcc-4893-93c9-60a6a5745571", name: "Ramada Residences Costa Adeje", url: "https://www.booking.com/hotel/es/clc-paradise-santa-cruz-de-tenerife.html" },
  { id: "af647673-c5d9-4cb6-8067-e89d014fde22", name: "Royal Marbella Golf Resort", url: "https://www.booking.com/hotel/es/royal-suites-marbella.html" },
  { id: "a77ccde6-1554-47d8-a6f5-d688d8c4a170", name: "Wyndham Residences Golf del Sur", url: "https://www.booking.com/hotel/es/clc-sunningdale-village.html" },
  { id: "892dc899-1827-4a54-bae9-451ac779e00e", name: "Wyndham Residences Costa Adeje", url: "https://www.booking.com/hotel/es/wyndham-residences-tenerife-costa-adeje.html" },
];

function hashPII(v) { return createHash("sha256").update(v.trim().toLowerCase()).digest("hex"); }
function cleanName(r) { if (!r) return null; const f = r.trim().split(/\s+/)[0]; return f.length > 0 ? f : null; }

function normalize(raw) {
  if (!raw.id) return null;
  return {
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
}

async function insertReviews(p, hotelId, reviews) {
  let ins = 0;
  for (const r of reviews) {
    const { rows } = await p.query(
      `INSERT INTO raw_reviews (hotel_id, external_id, source, check_in_date, check_out_date, liked_text, disliked_text, number_of_nights, rating, review_date, review_title, room_info, traveler_type, user_location, user_name_hash, review_language, helpful_votes, property_response, stay_room_id, hotel_rating, hotel_rating_label, hotel_reviews_count, hotel_rating_scores, reviewer_display_name)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
       ON CONFLICT (source, external_id) DO UPDATE SET reviewer_display_name = EXCLUDED.reviewer_display_name WHERE raw_reviews.reviewer_display_name IS NULL AND EXCLUDED.reviewer_display_name IS NOT NULL
       RETURNING id`,
      [hotelId, r.externalId, r.source, r.checkInDate, r.checkOutDate, r.likedText, r.dislikedText, r.numberOfNights, r.rating, r.reviewDate, r.reviewTitle, r.roomInfo, r.travelerType, r.userLocation, r.userNameHash, r.reviewLanguage, r.helpfulVotes, r.propertyResponse, r.stayRoomId, r.hotelRating, r.hotelRatingLabel, r.hotelReviewsCount, r.hotelRatingScores ? JSON.stringify(r.hotelRatingScores) : null, r.reviewerDisplayName]
    );
    if (rows.length > 0) ins++;
  }
  return ins;
}

async function pollRun(runId, label) {
  for (let i = 0; i < 360; i++) {
    try {
      const res = await fetch(`${BASE}/actor-runs/${runId}?token=${TOKEN}`);
      if (!res.ok) { await new Promise(r => setTimeout(r, 15000)); continue; }
      const text = await res.text();
      let data; try { data = JSON.parse(text); } catch { await new Promise(r => setTimeout(r, 15000)); continue; }
      const s = data.data?.status;
      if (s === "SUCCEEDED") return "SUCCEEDED";
      if (["FAILED","ABORTED","TIMED-OUT"].includes(s)) { console.error(`  [${label}] ${s}`); return s; }
    } catch { await new Promise(r => setTimeout(r, 15000)); continue; }
    if (i % 6 === 0) console.log(`  [${label}] Polling... (${Math.round(i*10/60)}min)`);
    await new Promise(r => setTimeout(r, 10000));
  }
  return "TIMEOUT";
}

async function fetchDataset(dsId) {
  let all = [], offset = 0;
  while (true) {
    try {
      const res = await fetch(`${BASE}/datasets/${dsId}/items?token=${TOKEN}&limit=1000&offset=${offset}`);
      if (!res.ok) break;
      const items = JSON.parse(await res.text());
      if (!Array.isArray(items) || items.length === 0) break;
      all = all.concat(items); offset += items.length;
      if (items.length < 1000) break;
    } catch { break; }
  }
  return all;
}

// Main
console.log(`Triggering ${HOTELS.length} Booking.com scrapes...\n`);
const runs = [];
for (const h of HOTELS) {
  const res = await fetch(`${BASE}/acts/${ACTOR}/runs?token=${TOKEN}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ startUrls: [{ url: h.url }], maxReviewsPerHotel: MAX, sortReviewsBy: "f_recent_desc", reviewScores: ["ALL"], proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] } }),
  });
  const data = await res.json();
  runs.push({ ...h, runId: data.data.id, datasetId: data.data.defaultDatasetId });
  console.log(`  [${h.name}] runId=${data.data.id}`);
  await new Promise(r => setTimeout(r, 500));
}

console.log(`\nPolling ${runs.length} runs...`);
const results = await Promise.all(runs.map(async r => {
  const status = await pollRun(r.runId, r.name);
  return { ...r, status };
}));

console.log("\nIngesting...");
let total = 0;
for (const r of results) {
  if (r.status !== "SUCCEEDED") { console.log(`  [${r.name}] Skipped (${r.status})`); continue; }
  const raw = await fetchDataset(r.datasetId);
  console.log(`  [${r.name}] Fetched ${raw.length} reviews`);
  if (raw.length === 0) continue;
  const norm = raw.map(normalize).filter(Boolean);
  for (const { name: db, pool: p } of pools) {
    const ins = await insertReviews(p, r.id, norm);
    console.log(`  [${r.name}][${db}] Inserted ${ins} new`);
    if (db === "local") total += ins;
  }
}

console.log(`\nDone! Total new Booking reviews: ${total}`);
await localPool.end(); await rdsPool.end(); process.exit(0);
