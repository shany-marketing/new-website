// Re-scrape a competitor to populate competitor_reviews
// Usage: npx tsx -r tsconfig-paths/register scripts/rescrape-competitor.mts <competitor-id>

import { register } from "node:module";
import { pathToFileURL } from "node:url";

// Set up env - load from .env.local
import { readFileSync } from "node:fs";
try {
  const envContent = readFileSync(".env.local", "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] = match[2].trim();
  }
} catch {}
process.env.DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:a1212333@localhost:5432/upstar_dev";

const competitorId = process.argv[2];
if (!competitorId) {
  console.error("Usage: npx tsx scripts/rescrape-competitor.mts <competitor-id>");
  process.exit(1);
}

// Dynamically import (tsx handles @/ aliases from tsconfig)
const { scrapeCompetitor } = await import("../src/lib/competitor.js");

console.log(`Starting re-scrape for competitor ${competitorId}...`);
await scrapeCompetitor(competitorId);

// Verify
const { query } = await import("../src/lib/db.js");
const rows = await query(
  "SELECT COUNT(*)::int AS count FROM competitor_reviews WHERE competitor_id = $1",
  [competitorId]
);
console.log(`Done! Stored ${(rows as any)[0]?.count ?? 0} competitor reviews.`);
process.exit(0);
