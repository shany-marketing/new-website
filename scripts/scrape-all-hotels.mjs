/**
 * scrape-all-hotels.mjs
 *
 * 1. Creates 8 hotels in the DB (if not already present)
 * 2. Triggers Apify scrapes on ALL 4 platforms for each hotel (maxReviews=10000)
 * 3. Polls all runs until completion
 * 4. Fetches datasets and ingests reviews via the app's normalize + ingest pipeline
 *
 * Usage:
 *   set -a && source .env.local && set +a
 *   node scripts/scrape-all-hotels.mjs
 *
 * Env vars needed: DATABASE_URL, APIFY_API_TOKEN, OPENAI_API_KEY
 */

import pg from "pg";
import fs from "fs";
import { createHash } from "crypto";
const { Pool } = pg;

// ── Config ──────────────────────────────────────────────────────────
const LOCAL_CONN = "postgresql://postgres:a1212333@localhost:5432/upstar_dev";
const RDS_CONN = "postgresql://upstar_admin:UpstarDb2026prod@upstar-db.clkosa6g6yx7.eu-west-1.rds.amazonaws.com:5432/upstar";

function makePool(connStr) {
  const isRds = connStr.includes("rds.amazonaws.com");
  return new Pool({
    connectionString: connStr.replace(/[?&]sslmode=[^&]*/g, ""),
    ssl: isRds ? { rejectUnauthorized: false } : false,
  });
}

const localPool = makePool(LOCAL_CONN);
const rdsPool = makePool(RDS_CONN);
const pools = [
  { name: "local", pool: localPool },
  { name: "RDS", pool: rdsPool },
];

let APIFY_TOKEN = process.env.APIFY_API_TOKEN;
if (!APIFY_TOKEN) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(/APIFY_API_TOKEN=(.+)/);
  if (match) APIFY_TOKEN = match[1].trim();
}
if (!APIFY_TOKEN) { console.error("No APIFY_API_TOKEN found!"); process.exit(1); }

const APIFY_BASE = "https://api.apify.com/v2";
const MAX_REVIEWS = 10000;

// ── Hotels to create & scrape ───────────────────────────────────────
const HOTELS = [
  {
    name: "Encantada Resort Vacation Townhomes by IDILIQ",
    booking_url: "https://www.booking.com/hotel/us/kissimmee-3070-secret-lake-drive.html",
    google_url: "https://www.google.com/maps/search/Encantada+Resort+Vacation+Townhomes+Kissimmee+FL",
    expedia_url: "https://www.expedia.com/Orlando-Hotels-CLC-Encantada-Resort-Vacation-Townhomes.h4651255.Hotel-Information",
    tripadvisor_url: "https://www.tripadvisor.com/Hotel_Review-g34352-d1201533-Reviews-Encantada_Resort_Vacation_Townhomes_By_Idiliq-Kissimmee_Florida.html",
  },
  {
    name: "Ramada Hotel & Suites by Wyndham Costa del Sol",
    booking_url: "https://www.booking.com/hotel/es/club-la-costa.en-gb.html",
    google_url: "https://www.google.com/maps/search/Ramada+Hotel+Suites+Wyndham+Costa+del+Sol+Fuengirola",
    expedia_url: "https://www.expedia.com/Mijas-Hotels-CLC-Marina-Park-Aparthotel.h2374866.Hotel-Information",
    tripadvisor_url: "https://www.tripadvisor.com/Hotel_Review-g187435-d27537233-Reviews-Ramada_Hotel_Suites_by_Wyndham_Costa_del_Sol-Costa_del_Sol_Province_of_Malaga_Andaluc.html",
  },
  {
    name: "Wyndham Grand Costa del Sol",
    booking_url: "https://www.booking.com/hotel/es/wyndham-grand-residences-costa-del-sol-mijas.html",
    google_url: "https://www.google.co.uk/travel/hotels/entity/CgsI2rzTjY-WhZLRARAB",
    expedia_url: "https://www.expedia.com/Mijas-Hotels-Wyndham-Grand-Residences-Costa-Del-Sol-Mijas.h73008125.Hotel-Information",
    tripadvisor_url: "https://www.tripadvisor.com/Hotel_Review-g15903057-d23770833-Reviews-Wyndham_Grand_Costa_Del_Sol-El_Faro_Mijas_Costa_del_Sol_Province_of_Malaga_Andaluci.html",
  },
  {
    name: "Wyndham Duchally Country Estate",
    booking_url: "https://www.booking.com/hotel/gb/duchally-country-estate.en-gb.html",
    google_url: "https://www.google.com/maps/search/Wyndham+Duchally+Country+Estate+Auchterarder+Scotland",
    expedia_url: "https://www.expedia.com/Auchterarder-Hotels-CLC-Duchally-Country-Estate-Hotel-Resort.h79023.Hotel-Information",
    tripadvisor_url: "https://www.tripadvisor.com/Hotel_Review-g551796-d1217137-Reviews-Wyndham_Duchally_Country_Estate-Auchterarder_Perth_and_Kinross_Scotland.html",
  },
  {
    name: "Ramada Residences by Wyndham Costa Adeje",
    booking_url: "https://www.booking.com/hotel/es/clc-paradise-santa-cruz-de-tenerife.en-gb.html",
    google_url: "https://www.google.com/maps/search/Ramada+Residences+Wyndham+Costa+Adeje+Tenerife",
    expedia_url: "https://www.expedia.com/Adeje-Hotels-Ramada-Residences-By-Wyndham-Costa-Adeje.h57202681.Hotel-Information",
    tripadvisor_url: "https://www.tripadvisor.com/Hotel_Review-g662606-d296322-Reviews-Ramada_Residences_by_Wyndham_Costa_Adeje-Costa_Adeje_Adeje_Tenerife_Canary_Islands.html",
  },
  {
    name: "Royal Marbella Golf Resort",
    booking_url: "https://www.booking.com/hotel/es/royal-marbella-residences-2br-by-alfresco.html",
    google_url: "https://www.google.com/maps/search/Royal+Marbella+Golf+Resort+Benahavis+Spain",
    expedia_url: "https://www.expedia.com/Benahavis-Hotels-Royal-Marbella-Golf-Resort.h99114781.Hotel-Reviews",
    tripadvisor_url: "https://www.tripadvisor.com/Hotel_Review-g608965-d3170138-Reviews-Royal_Marbella_Golf_Resort-Benahavis_Costa_del_Sol_Province_of_Malaga_Andalucia.html",
  },
  {
    name: "Wyndham Residences Golf del Sur",
    booking_url: "https://www.booking.com/hotel/es/clc-sunningdale-village.en-gb.html",
    google_url: "https://www.google.com/maps/search/Wyndham+Residences+Golf+del+Sur+Tenerife",
    expedia_url: "https://www.expedia.com/San-Miguel-De-Abona-Hotels-CLC-Sunningdale-Village-Resort-Apartments-Villas.h4924979.Hotel-Information",
    tripadvisor_url: "https://www.tripadvisor.com/Hotel_Review-g635888-d1654191-Reviews-Wyndham_Residences_Golf_del_Sur-San_Miguel_de_Abona_Tenerife_Canary_Islands.html",
  },
  {
    name: "Wyndham Residences Costa Adeje",
    booking_url: "https://www.booking.com/hotel/es/wyndham-residences-tenerife-costa-adeje.html",
    google_url: "https://www.google.co.uk/maps/place/Wyndham+Residences+Costa+Adeje/@28.0760159,-16.7244703,15z",
    expedia_url: "https://www.expedia.com/Adeje-Hotels-Wyndham-Residences-Tenerife-Costa-Adeje.h70078231.Hotel-Information",
    tripadvisor_url: "https://www.tripadvisor.com/Hotel_Review-g662606-d659043-Reviews-Wyndham_Residences_Costa_Adeje-Costa_Adeje_Adeje_Tenerife_Canary_Islands.html",
  },
];

const ACTOR_IDS = {
  booking: "voyager~booking-reviews-scraper",
  google: "compass~google-maps-reviews-scraper",
  expedia: "tri_angle~expedia-hotels-com-reviews-scraper",
  tripadvisor: "maxcopell~tripadvisor-reviews",
};

const buildInput = {
  booking: (url) => ({
    startUrls: [{ url }],
    maxReviewsPerHotel: MAX_REVIEWS,
    sortReviewsBy: "f_recent_desc",
    reviewScores: ["ALL"],
  }),
  google: (url) => ({
    startUrls: [{ url }],
    maxReviews: MAX_REVIEWS,
    reviewsSort: "newest",
    language: "en",
    reviewsOrigin: "all",
  }),
  expedia: (url) => ({
    startUrls: [{ url }],
    maxReviewsPerHotel: MAX_REVIEWS,
    sortBy: "Most recent",
  }),
  tripadvisor: (url) => ({
    startUrls: [{ url }],
    maxItemsPerQuery: MAX_REVIEWS,
    reviewRatings: ["ALL_REVIEW_RATINGS"],
    reviewsLanguages: ["ALL_REVIEW_LANGUAGES"],
  }),
};

// ── Normalizers (standalone, mirrors src/lib/normalize.ts) ──────────

function hashPII(value) {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

function cleanName(raw) {
  if (!raw) return null;
  const first = raw.trim().split(/\s+/)[0];
  return first.length > 0 ? first : null;
}

function normalizeBooking(raw) {
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
    reviewLanguage: raw.reviewLanguage?.trim() || null,
    helpfulVotes: raw.helpfulVotes ?? null,
    propertyResponse: raw.propertyResponse?.trim() || null,
    stayRoomId: raw.stayRoomId ?? null,
    hotelRating: raw.hotelRating ?? null, hotelRatingLabel: raw.hotelRatingLabel?.trim() || null,
    hotelReviewsCount: raw.hotelReviews ?? null,
    hotelRatingScores: raw.hotelRatingScores ?? null,
  };
}

function normalizeGoogle(raw) {
  if (!raw.reviewId) return null;
  return {
    source: "google", externalId: String(raw.reviewId),
    checkInDate: null, checkOutDate: null,
    likedText: raw.text?.trim() || raw.textTranslated?.trim() || null, dislikedText: null,
    numberOfNights: null, rating: raw.stars != null ? raw.stars * 2 : null,
    reviewDate: raw.publishedAtDate ?? raw.publishedAt ?? null, reviewTitle: null,
    roomInfo: null, travelerType: null, userLocation: null,
    userNameHash: raw.name ? hashPII(raw.name) : hashPII("anonymous"),
    reviewerDisplayName: cleanName(raw.name),
    reviewLanguage: raw.language ?? null, helpfulVotes: raw.likesCount ?? null,
    propertyResponse: raw.responseFromOwnerText?.trim() || null,
    stayRoomId: null, hotelRating: null, hotelRatingLabel: null,
    hotelReviewsCount: null, hotelRatingScores: null,
  };
}

function normalizeExpedia(raw) {
  if (!raw.id) return null;
  let rating = null;
  const sv = raw.reviewScoreWithDescription?.value;
  if (sv != null) { const p = typeof sv === "number" ? sv : parseFloat(String(sv)); if (!isNaN(p)) rating = p <= 5 ? p * 2 : p; }
  const authorName = raw.reviewAuthorAttribution?.text || raw.userNickname;
  const reviewDate = typeof raw.submissionTime === "string" ? raw.submissionTime : raw.submissionTime?.longDateFormat ?? null;
  return {
    source: "expedia", externalId: String(raw.id),
    checkInDate: null, checkOutDate: null,
    likedText: raw.text?.trim() || null, dislikedText: null,
    numberOfNights: null, rating, reviewDate, reviewTitle: raw.title?.trim() || null,
    roomInfo: null, travelerType: raw.travelers?.trim() || null, userLocation: null,
    userNameHash: authorName ? hashPII(authorName) : hashPII("anonymous"),
    reviewerDisplayName: cleanName(authorName),
    reviewLanguage: raw.locale ?? null, helpfulVotes: null,
    propertyResponse: raw.managementResponses?.[0]?.text?.trim() || null,
    stayRoomId: null, hotelRating: null, hotelRatingLabel: null,
    hotelReviewsCount: null, hotelRatingScores: null,
  };
}

function normalizeTripAdvisor(raw) {
  if (!raw.id) return null;
  return {
    source: "tripadvisor", externalId: String(raw.id),
    checkInDate: null, checkOutDate: null,
    likedText: raw.text?.trim() || null, dislikedText: null,
    numberOfNights: null, rating: raw.rating != null ? raw.rating * 2 : null,
    reviewDate: raw.publishedDate ?? null, reviewTitle: raw.title?.trim() || null,
    roomInfo: raw.roomTip?.trim() || null, travelerType: raw.tripType?.trim() || null,
    userLocation: raw.userLocation?.name?.trim() || null,
    userNameHash: raw.user?.username ? hashPII(raw.user.username) : hashPII("anonymous"),
    reviewerDisplayName: cleanName(raw.user?.username),
    reviewLanguage: raw.language ?? null, helpfulVotes: raw.helpfulVotes ?? null,
    propertyResponse: raw.ownerResponse?.text?.trim() || null,
    stayRoomId: null, hotelRating: null, hotelRatingLabel: null,
    hotelReviewsCount: null, hotelRatingScores: null,
  };
}

const NORMALIZERS = { booking: normalizeBooking, google: normalizeGoogle, expedia: normalizeExpedia, tripadvisor: normalizeTripAdvisor };

function normalizeBatch(rawReviews, source) {
  const fn = NORMALIZERS[source];
  return rawReviews.map(fn).filter(Boolean);
}

// ── DB helpers ──────────────────────────────────────────────────────

async function ensureHotel(p, h, forceId = null) {
  const { rows } = await p.query("SELECT id FROM hotels WHERE booking_url = $1", [h.booking_url]);
  if (rows.length > 0) {
    await p.query(
      `UPDATE hotels SET
        google_url = COALESCE(google_url, $2),
        expedia_url = COALESCE(expedia_url, $3),
        tripadvisor_url = COALESCE(tripadvisor_url, $4)
      WHERE id = $1`,
      [rows[0].id, h.google_url, h.expedia_url, h.tripadvisor_url]
    );
    return rows[0].id;
  }
  if (forceId) {
    // Use the same UUID on RDS as local for consistency
    const { rows: created } = await p.query(
      `INSERT INTO hotels (id, name, booking_url, google_url, expedia_url, tripadvisor_url)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [forceId, h.name, h.booking_url, h.google_url, h.expedia_url, h.tripadvisor_url]
    );
    return created[0].id;
  }
  const { rows: created } = await p.query(
    `INSERT INTO hotels (name, booking_url, google_url, expedia_url, tripadvisor_url)
     VALUES ($1, $2, $3, $4, $5) RETURNING id`,
    [h.name, h.booking_url, h.google_url, h.expedia_url, h.tripadvisor_url]
  );
  return created[0].id;
}

async function insertReviews(p, hotelId, reviews) {
  let inserted = 0;
  for (const r of reviews) {
    const { rows } = await p.query(
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
        reviewer_display_name = EXCLUDED.reviewer_display_name
      WHERE raw_reviews.reviewer_display_name IS NULL
        AND EXCLUDED.reviewer_display_name IS NOT NULL
      RETURNING id`,
      [
        hotelId, r.externalId, r.source, r.checkInDate, r.checkOutDate,
        r.likedText, r.dislikedText, r.numberOfNights, r.rating,
        r.reviewDate, r.reviewTitle, r.roomInfo, r.travelerType,
        r.userLocation, r.userNameHash,
        r.reviewLanguage, r.helpfulVotes, r.propertyResponse, r.stayRoomId,
        r.hotelRating, r.hotelRatingLabel, r.hotelReviewsCount,
        r.hotelRatingScores ? JSON.stringify(r.hotelRatingScores) : null,
        r.reviewerDisplayName,
      ]
    );
    if (rows.length > 0) inserted++;
  }
  return inserted;
}

// ── Apify helpers ───────────────────────────────────────────────────

async function triggerRun(source, url) {
  const actorId = ACTOR_IDS[source];
  const input = buildInput[source](url);
  const res = await fetch(`${APIFY_BASE}/acts/${actorId}/runs?token=${APIFY_TOKEN}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`Trigger failed (${res.status}): ${await res.text()}`);
  const data = await res.json();
  return { runId: data.data.id, datasetId: data.data.defaultDatasetId };
}

async function pollRun(runId, label) {
  const maxAttempts = 360; // 60 min
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const res = await fetch(`${APIFY_BASE}/actor-runs/${runId}?token=${APIFY_TOKEN}`);
      if (!res.ok) {
        if (i % 6 === 0) console.log(`  [${label}] Poll HTTP ${res.status}, retrying...`);
        await new Promise((r) => setTimeout(r, 15_000));
        continue;
      }
      const text = await res.text();
      let data;
      try { data = JSON.parse(text); } catch {
        if (i % 6 === 0) console.log(`  [${label}] Non-JSON response, retrying...`);
        await new Promise((r) => setTimeout(r, 15_000));
        continue;
      }
      const status = data.data?.status;
      if (status === "SUCCEEDED") return "SUCCEEDED";
      if (["FAILED", "ABORTED", "TIMED-OUT"].includes(status)) {
        console.error(`  [${label}] Run ${status}: ${data.data?.statusMessage || ""}`);
        return status;
      }
    } catch (err) {
      if (i % 6 === 0) console.log(`  [${label}] Poll error: ${err.message}, retrying...`);
      await new Promise((r) => setTimeout(r, 15_000));
      continue;
    }
    if (i % 6 === 0) console.log(`  [${label}] Polling... (${Math.round(i * 10 / 60)}min)`);
    await new Promise((r) => setTimeout(r, 10_000));
  }
  return "TIMEOUT";
}

async function fetchDataset(datasetId) {
  let all = [];
  let offset = 0;
  const limit = 1000;
  const maxRetries = 3;
  while (true) {
    let items;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const res = await fetch(`${APIFY_BASE}/datasets/${datasetId}/items?token=${APIFY_TOKEN}&limit=${limit}&offset=${offset}`);
        if (!res.ok) { await new Promise(r => setTimeout(r, 5000)); continue; }
        const text = await res.text();
        items = JSON.parse(text);
        break;
      } catch {
        if (attempt === maxRetries - 1) throw new Error(`Dataset fetch failed after ${maxRetries} attempts`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }
    if (!Array.isArray(items) || items.length === 0) break;
    all = all.concat(items);
    offset += items.length;
    if (items.length < limit) break;
  }
  return all;
}

// ── Main ────────────────────────────────────────────────────────────

console.log("=== UpStar Multi-Hotel Scraper ===\n");
console.log(`Target: ${HOTELS.length} hotels × 4 platforms = up to ${HOTELS.length * 4} scrape runs`);
console.log(`Max reviews per platform: ${MAX_REVIEWS}\n`);

// Step 1: Create hotels in BOTH DBs
console.log("── Step 1: Creating hotels ──");
const hotelIds = [];
for (const h of HOTELS) {
  // Create on local first to get the ID
  const localId = await ensureHotel(localPool, h);
  // Create on RDS with same ID for consistency
  await ensureHotel(rdsPool, h, localId);
  hotelIds.push(localId);
  console.log(`  ${h.name} → ${localId}`);
}

// Step 2: Trigger all scrapes (or resume existing runs)
const SOURCES = ["booking", "google", "expedia", "tripadvisor"];
const URL_KEYS = { booking: "booking_url", google: "google_url", expedia: "expedia_url", tripadvisor: "tripadvisor_url" };

// Check for --resume flag: skip triggering and use existing run IDs
const RESUME_RUNS = process.argv.includes("--resume") ? [
  { hotelIdx: 0, source: "booking", runId: "CsXBIsvoUNtSMlwV7" },
  { hotelIdx: 0, source: "google", runId: "2mKlR4TW1pvXrZelj" },
  { hotelIdx: 0, source: "expedia", runId: "5crXUzukArjYtE2rm" },
  { hotelIdx: 0, source: "tripadvisor", runId: "6QlNHb8RFl6QxssCj" },
  { hotelIdx: 1, source: "booking", runId: "O6Z2tgCeX47lx1TwF" },
  { hotelIdx: 1, source: "google", runId: "fCPsNHDYN3PEJJsA0" },
  { hotelIdx: 1, source: "expedia", runId: "vdvjHwhDSszZ6wOuz" },
  { hotelIdx: 1, source: "tripadvisor", runId: "D5sgzCHuWVtxwkLmA" },
  { hotelIdx: 2, source: "booking", runId: "PFfBxZ2kHguAYbOnS" },
  { hotelIdx: 2, source: "google", runId: "666jc19qlx2d0TMou" },
  { hotelIdx: 2, source: "expedia", runId: "dOYZhu6IpX1aJaAhi" },
  { hotelIdx: 2, source: "tripadvisor", runId: "JIHancYn9vDaA3fyh" },
  { hotelIdx: 3, source: "booking", runId: "dbCNKhDfRlpa2RvuJ" },
  { hotelIdx: 3, source: "google", runId: "ZlaahaLJMbGFUoElL" },
  { hotelIdx: 3, source: "expedia", runId: "tIJZUaVsDaUBeAJ2N" },
  { hotelIdx: 3, source: "tripadvisor", runId: "7qEu22ciCs0S0nNoC" },
  { hotelIdx: 4, source: "booking", runId: "KuJdIcUA5RrdsMB1u" },
  { hotelIdx: 4, source: "google", runId: "LIaD4ZmLFUTQ0JMmV" },
  { hotelIdx: 4, source: "expedia", runId: "0bJLaY5Y5bDJzYBT8" },
  { hotelIdx: 4, source: "tripadvisor", runId: "We4V6zTl75t4a4fvn" },
  { hotelIdx: 5, source: "booking", runId: "zNcuYWeU3OsrDrlBn" },
  { hotelIdx: 5, source: "google", runId: "kXKPBmoN4JKBHImaM" },
  { hotelIdx: 5, source: "expedia", runId: "VahO0cmH8Ll8DIDYm" },
  { hotelIdx: 5, source: "tripadvisor", runId: "f3dPod1KGbqlX5nTR" },
  { hotelIdx: 6, source: "booking", runId: "GOuh5FQ89Aag4xDEL" },
  { hotelIdx: 6, source: "google", runId: "9O0sdjGgCljLv5xMK" },
  { hotelIdx: 6, source: "expedia", runId: "0HgJhEHpB8ZGwmgMt" },
  { hotelIdx: 6, source: "tripadvisor", runId: "ojLv2CKBi2CwtBnTp" },
  { hotelIdx: 7, source: "booking", runId: "0m9yp0cp9KfPQaIED" },
  { hotelIdx: 7, source: "google", runId: "MHLXIbVIgLtNYpPKJ" },
  { hotelIdx: 7, source: "expedia", runId: "VtTzTa9daA3dQ8GO5" },
  { hotelIdx: 7, source: "tripadvisor", runId: "7yQuIJN8fKfkc8TfL" },
] : null;

let runs; // { hotelIdx, source, runId, datasetId? }

if (RESUME_RUNS) {
  console.log("\n── Step 2: Resuming existing runs ──");
  // Fetch datasetIds from existing runs
  runs = [];
  for (const r of RESUME_RUNS) {
    try {
      const res = await fetch(`${APIFY_BASE}/actor-runs/${r.runId}?token=${APIFY_TOKEN}`);
      const data = await res.json();
      runs.push({ ...r, datasetId: data.data?.defaultDatasetId });
    } catch {
      runs.push({ ...r, datasetId: null });
    }
  }
  console.log(`  Resumed ${runs.length} runs`);
} else {
  console.log("\n── Step 2: Triggering scrapes ──");
  runs = [];
  for (let i = 0; i < HOTELS.length; i++) {
    for (const source of SOURCES) {
      const url = HOTELS[i][URL_KEYS[source]];
      if (!url) { console.log(`  [${HOTELS[i].name}][${source}] No URL — skip`); continue; }
      try {
        const { runId, datasetId } = await triggerRun(source, url);
        runs.push({ hotelIdx: i, source, runId, datasetId });
        console.log(`  [${HOTELS[i].name}][${source}] → runId=${runId}`);
      } catch (err) {
        console.error(`  [${HOTELS[i].name}][${source}] FAILED: ${err.message}`);
      }
      await new Promise((r) => setTimeout(r, 500));
    }
  }
}

console.log(`\n── Step 3: Polling ${runs.length} runs ──`);

// Poll all runs concurrently
const pollResults = await Promise.all(
  runs.map(async (run) => {
    const label = `${HOTELS[run.hotelIdx].name.slice(0, 20)}|${run.source}`;
    const status = await pollRun(run.runId, label);
    return { ...run, status };
  })
);

// Step 4: Fetch & ingest
console.log("\n── Step 4: Fetching & ingesting ──");
let totalInserted = 0;

for (const run of pollResults) {
  const hotelName = HOTELS[run.hotelIdx].name;
  const hotelId = hotelIds[run.hotelIdx];

  if (run.status !== "SUCCEEDED") {
    console.log(`  [${hotelName}][${run.source}] Skipped (status: ${run.status})`);
    continue;
  }

  try {
    const rawReviews = await fetchDataset(run.datasetId);
    console.log(`  [${hotelName}][${run.source}] Fetched ${rawReviews.length} reviews`);

    if (rawReviews.length === 0) continue;

    const normalized = normalizeBatch(rawReviews, run.source);

    // Insert into BOTH databases
    for (const { name: dbName, pool: p } of pools) {
      try {
        const inserted = await insertReviews(p, hotelId, normalized);
        console.log(`  [${hotelName}][${run.source}][${dbName}] Inserted ${inserted} new (${normalized.length} total)`);
        if (dbName === "local") totalInserted += inserted;
      } catch (err) {
        console.error(`  [${hotelName}][${run.source}][${dbName}] Insert error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error(`  [${hotelName}][${run.source}] Ingest error: ${err.message}`);
  }
}

console.log(`\n=== DONE ===`);
console.log(`Total new reviews inserted: ${totalInserted}`);
console.log(`\nHotel IDs for reference:`);
for (let i = 0; i < HOTELS.length; i++) {
  console.log(`  ${HOTELS[i].name}: ${hotelIds[i]}`);
}

await localPool.end();
await rdsPool.end();
process.exit(0);
