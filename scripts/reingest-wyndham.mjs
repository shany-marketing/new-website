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

const BASE = "https://api.apify.com/v2";

const DATASETS = [
  { source: "booking",     datasetId: "qNUddErcicK1mIgIc" },
  { source: "google",      datasetId: "BYviGXfXAq45abreP" },
  { source: "expedia",     datasetId: "4N5zw9mOvzGJXohae" },
  { source: "tripadvisor", datasetId: "tnLbyHNbfdTxxRkRz" },
];

function hashPII(v) { return crypto.createHash("sha256").update(v.trim().toLowerCase()).digest("hex"); }
function cleanName(n) { return n?.trim()?.split(/\s+/)[0] || null; }

const NORM = {
  booking: (r) => !r.id ? null : { source:"booking", externalId:String(r.id), checkInDate:r.checkInDate??null, checkOutDate:r.checkOutDate??null, likedText:r.likedText?.trim()||null, dislikedText:r.dislikedText?.trim()||null, numberOfNights:r.numberOfNights??null, rating:r.rating??null, reviewDate:r.reviewDate??null, reviewTitle:r.reviewTitle?.trim()||null, roomInfo:r.roomInfo?.trim()||null, travelerType:r.travelerType?.trim()||null, userLocation:r.userLocation?.trim()||null, userNameHash:r.userName?hashPII(r.userName):hashPII("anonymous"), reviewerDisplayName:cleanName(r.userName), reviewLanguage:r.reviewLanguage?.trim()||null, helpfulVotes:r.helpfulVotes??null, propertyResponse:r.propertyResponse?.trim()||null, stayRoomId:r.stayRoomId??null, hotelRating:r.hotelRating??null, hotelRatingLabel:r.hotelRatingLabel?.trim()||null, hotelReviewsCount:r.hotelReviews??null, hotelRatingScores:r.hotelRatingScores??null },
  google: (r) => !r.reviewId ? null : { source:"google", externalId:String(r.reviewId), checkInDate:null, checkOutDate:null, likedText:r.text?.trim()||r.textTranslated?.trim()||null, dislikedText:null, numberOfNights:null, rating:r.stars!=null?r.stars*2:null, reviewDate:r.publishedAtDate??r.publishedAt??null, reviewTitle:null, roomInfo:null, travelerType:null, userLocation:null, userNameHash:r.name?hashPII(r.name):hashPII("anonymous"), reviewerDisplayName:cleanName(r.name), reviewLanguage:r.language??null, helpfulVotes:r.likesCount??null, propertyResponse:r.responseFromOwnerText?.trim()||null, stayRoomId:null, hotelRating:null, hotelRatingLabel:null, hotelReviewsCount:null, hotelRatingScores:null },
  expedia: (r) => { if(!r.id) return null; let rating=null; const sv=r.reviewScoreWithDescription?.value; if(sv!=null){const p=typeof sv==="number"?sv:parseFloat(String(sv)); if(!isNaN(p)) rating=p<=5?p*2:p;} return { source:"expedia", externalId:String(r.id), checkInDate:null, checkOutDate:null, likedText:r.text?.trim()||null, dislikedText:null, numberOfNights:null, rating, reviewDate:typeof r.submissionTime==="string"?r.submissionTime:r.submissionTime?.longDateFormat??null, reviewTitle:r.title?.trim()||null, roomInfo:null, travelerType:r.travelers?.trim()||null, userLocation:null, userNameHash:(r.reviewAuthorAttribution?.text||r.userNickname)?hashPII(r.reviewAuthorAttribution?.text||r.userNickname):hashPII("anonymous"), reviewerDisplayName:cleanName(r.reviewAuthorAttribution?.text||r.userNickname), reviewLanguage:r.locale??null, helpfulVotes:null, propertyResponse:r.managementResponses?.[0]?.text?.trim()||null, stayRoomId:null, hotelRating:null, hotelRatingLabel:null, hotelReviewsCount:null, hotelRatingScores:null }; },
  tripadvisor: (r) => !r.id ? null : { source:"tripadvisor", externalId:String(r.id), checkInDate:null, checkOutDate:null, likedText:r.text?.trim()||null, dislikedText:null, numberOfNights:null, rating:r.rating!=null?r.rating*2:null, reviewDate:r.publishedDate??null, reviewTitle:r.title?.trim()||null, roomInfo:r.roomTip?.trim()||null, travelerType:r.tripType?.trim()||null, userLocation:r.userLocation?.name?.trim()||null, userNameHash:r.user?.username?hashPII(r.user.username):hashPII("anonymous"), reviewerDisplayName:cleanName(r.user?.username), reviewLanguage:r.language??null, helpfulVotes:r.helpfulVotes??null, propertyResponse:r.ownerResponse?.text?.trim()||null, stayRoomId:null, hotelRating:null, hotelRatingLabel:null, hotelReviewsCount:null, hotelRatingScores:null },
};

for (const { source, datasetId } of DATASETS) {
  console.log(`[${source}] Fetching dataset ${datasetId}...`);
  let all = [], offset = 0;
  while (true) {
    const res = await fetch(`${BASE}/datasets/${datasetId}/items?token=${token}&limit=1000&offset=${offset}`);
    if (!res.ok) { console.error(`  FAILED: ${res.status}`); break; }
    const items = await res.json();
    if (!Array.isArray(items) || items.length === 0) break;
    all = all.concat(items);
    offset += items.length;
    if (items.length < 1000) break;
  }
  console.log(`  Fetched ${all.length} raw`);
  if (all.length === 0) continue;

  const norm = all.map(r => NORM[source](r)).filter(Boolean);
  console.log(`  Normalized ${norm.length}`);

  let inserted = 0, errors = 0;
  for (const r of norm) {
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
        ON CONFLICT (source, external_id) DO NOTHING
        RETURNING id`,
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
    } catch (err) {
      errors++;
      if (errors <= 3) console.error(`  Insert error:`, err.message);
    }
  }
  console.log(`  Inserted ${inserted}, errors ${errors}, skipped ${norm.length - inserted - errors}`);
}

// Final count
const { rows } = await pool.query(
  "SELECT source, COUNT(*) as count FROM raw_reviews WHERE hotel_id = $1 GROUP BY source ORDER BY source",
  [HOTEL_ID]
);
console.log("\n=== Reviews in DB for Wyndham ===");
let total = 0;
for (const row of rows) { console.log(`  ${row.source}: ${row.count}`); total += parseInt(row.count); }
console.log(`  TOTAL: ${total}`);

await pool.end();
