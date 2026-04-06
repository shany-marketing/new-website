import pg from "pg";
import fs from "fs";
const { Pool } = pg;

const pool = new Pool({ connectionString: "postgresql://postgres:a1212333@localhost:5432/upstar_dev" });

const HOTEL_ID = "710a17c1-b011-4167-a4d3-1a9cb1ef0b42";

// Fetch all platform URLs
const { rows } = await pool.query(
  "SELECT booking_url, google_url, expedia_url, tripadvisor_url FROM hotels WHERE id = $1",
  [HOTEL_ID]
);
const hotel = rows[0];
console.log("Platform URLs:", JSON.stringify(hotel, null, 2));
await pool.end();

// Load APIFY_API_TOKEN
let token = process.env.APIFY_API_TOKEN;
if (!token) {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const match = envContent.match(/APIFY_API_TOKEN=(.+)/);
  if (match) token = match[1].trim();
}
if (!token) { console.error("No APIFY_API_TOKEN found!"); process.exit(1); }

const ACTOR_IDS = {
  booking: "voyager~booking-reviews-scraper",
  google: "compass~google-maps-reviews-scraper",
  expedia: "tri_angle~expedia-hotels-com-reviews-scraper",
  tripadvisor: "maxcopell~tripadvisor-reviews",
};

const INPUTS = {
  booking: (url) => ({
    startUrls: [{ url }],
    maxReviewsPerHotel: 5000,
    sortReviewsBy: "f_recent_desc",
    reviewScores: ["ALL"],
  }),
  google: (url) => ({
    startUrls: [{ url }],
    maxReviews: 5000,
    reviewsSort: "newest",
    language: "en",
    reviewsOrigin: "all",
  }),
  expedia: (url) => ({
    startUrls: [{ url }],
    maxReviewsPerHotel: 5000,
    sortBy: "Most recent",
  }),
  tripadvisor: (url) => ({
    startUrls: [{ url }],
    maxItemsPerQuery: 5000,
    reviewRatings: ["ALL_REVIEW_RATINGS"],
    reviewsLanguages: ["ALL_REVIEW_LANGUAGES"],
  }),
};

const PLATFORMS = [
  { source: "booking", url: hotel.booking_url },
  { source: "google", url: hotel.google_url },
  { source: "expedia", url: hotel.expedia_url },
  { source: "tripadvisor", url: hotel.tripadvisor_url },
];

for (const { source, url } of PLATFORMS) {
  if (!url) { console.log(`[${source}] No URL — skipping`); continue; }
  console.log(`[${source}] Triggering scrape...`);
  try {
    const actorId = ACTOR_IDS[source];
    const input = INPUTS[source](url);
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      console.error(`[${source}] FAILED (${res.status}): ${text}`);
      continue;
    }
    const data = await res.json();
    console.log(`[${source}] Started — runId: ${data.data.id}, datasetId: ${data.data.defaultDatasetId}`);
  } catch (err) {
    console.error(`[${source}] Error:`, err.message);
  }
}

console.log("\nAll scrapes triggered. They run on Apify in background.");
