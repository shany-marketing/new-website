import { readFileSync } from 'fs';
for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) process.env[m[1].trim()] = m[2].trim();
}

async function main() {
  const token = process.env.APIFY_API_TOKEN!;
  const datasetId = 'fAug4X96IaqDffa3B';
  const hotelId = 'ba600f68-317a-4455-b1eb-1939e930f3a5';

  const res = await fetch(`https://api.apify.com/v2/datasets/${datasetId}/items?token=${token}&limit=5000`);
  const items = await res.json();
  console.log(`Fetched ${items.length} reviews from Apify`);

  const { normalizeBatch } = await import('../src/lib/normalize');
  const { insertReviews } = await import('../src/lib/ingest');

  const normalized = normalizeBatch(items);
  console.log(`Normalized ${normalized.length} reviews`);

  // Show names before inserting
  for (const r of normalized.slice(0, 5)) {
    console.log(`  ${r.externalId}: displayName="${r.reviewerDisplayName}" hash=${r.userNameHash.slice(0,8)}...`);
  }

  const { count: inserted } = await insertReviews(hotelId, normalized);
  console.log(`Inserted/updated: ${inserted}`);

  // Verify
  const { query } = await import('../src/lib/db');
  const rows = await query('SELECT reviewer_display_name FROM raw_reviews WHERE hotel_id = $1', [hotelId]);
  console.log('Display names in DB:', rows.map((r: any) => r.reviewer_display_name));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
