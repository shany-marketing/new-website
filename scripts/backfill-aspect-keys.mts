import { Pool } from "pg";
import OpenAI from "openai";

const connStr = process.env.DATABASE_URL?.replace(/[?&]sslmode=[^&]*/g, "") ?? "";
const isRds = connStr.includes("rds.amazonaws.com");
const pool = new Pool({ connectionString: connStr, ssl: isRds ? { rejectUnauthorized: false } : false });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HOTEL_ID = process.argv[2] || "75e034fb-0192-40c8-99d6-149ee038d0d1";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const BATCH = 50; // items per LLM call
const CONCURRENCY = 3; // parallel LLM calls

const SYSTEM_PROMPT = `You are a hotel review classification engine.

Given a list of atomic feedback items (each with an id, text, and sentiment), assign a stable snake_case aspect_key to each one.

Common aspect keys (use these when applicable, or create new ones if needed):
staff_service, room_cleanliness, room_comfort, room_size, room_quality, room_maintenance,
bathroom_quality, bed_comfort, breakfast_quality, food_quality, food_variety,
pool_quality, pool_cleanliness, location, noise, wifi, parking, check_in,
check_out, value_for_money, air_conditioning, view, decor, amenities,
spa_quality, gym_quality, beach_access, pet_friendly, family_friendly,
accessibility, safety, expectation_gap, general_atmosphere

Rules:
- Use existing keys from the list above when they fit
- Create new snake_case keys only when no existing key matches
- Keep keys consistent (same topic = same key)
- "expectation_gap" is for expectation-vs-reality statements only

Return a JSON object: {"results": [{"id": "...", "aspect_key": "..."}]}
Return ONLY valid JSON. No markdown, no explanation.`;

interface Item {
  id: string;
  text: string;
  sentiment: string;
}

async function classifyBatch(items: Item[]): Promise<Map<string, string>> {
  const input = items.map((i) => ({ id: i.id, text: i.text, sentiment: i.sentiment }));

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: JSON.stringify(input) },
    ],
  });

  const content = resp.choices[0]?.message?.content;
  if (!content) return new Map();

  try {
    const parsed = JSON.parse(content);
    const results: { id: string; aspect_key: string }[] = parsed.results ?? parsed;
    const map = new Map<string, string>();
    for (const r of results) {
      const key = r.aspect_key?.trim().toLowerCase().replace(/[^a-z0-9_]+/g, "_").replace(/^_+|_+$/g, "") || "other";
      map.set(r.id, key);
    }
    return map;
  } catch {
    console.error("Failed to parse LLM response");
    return new Map();
  }
}

async function processBatch(items: Item[]): Promise<number> {
  const map = await classifyBatch(items);
  if (map.size === 0) return 0;

  // Bulk update — skip any corrupted UUIDs from LLM
  const values: string[] = [];
  const params: any[] = [];
  let idx = 0;
  for (const [id, aspectKey] of map) {
    if (!UUID_RE.test(id)) continue; // LLM sometimes corrupts IDs
    values.push(`($${idx * 2 + 1}::uuid, $${idx * 2 + 2})`);
    params.push(id, aspectKey);
    idx++;
  }
  if (values.length === 0) return 0;

  await pool.query(
    `UPDATE atomic_items AS a SET aspect_key = v.ak FROM (VALUES ${values.join(",")}) AS v(id, ak) WHERE a.id = v.id`,
    params
  );

  return map.size;
}

(async () => {
  const { rows: items } = await pool.query<Item>(
    "SELECT id::text, text, sentiment FROM atomic_items WHERE hotel_id = $1 AND aspect_key IS NULL ORDER BY id",
    [HOTEL_ID]
  );

  console.log(`${items.length} items to classify for hotel ${HOTEL_ID}`);
  if (items.length === 0) {
    await pool.end();
    process.exit(0);
  }

  let done = 0;
  // Process in chunks of CONCURRENCY * BATCH
  for (let i = 0; i < items.length; i += CONCURRENCY * BATCH) {
    const chunk = items.slice(i, i + CONCURRENCY * BATCH);
    const batches: Item[][] = [];
    for (let j = 0; j < chunk.length; j += BATCH) {
      batches.push(chunk.slice(j, j + BATCH));
    }

    const results = await Promise.all(batches.map((b) => processBatch(b)));
    done += results.reduce((a, b) => a + b, 0);
    console.log(`  ${done}/${items.length}`);
  }

  console.log(`Done! Classified ${done} items.`);
  await pool.end();
  process.exit(0);
})();
