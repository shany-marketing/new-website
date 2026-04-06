import { Pool } from "pg";
import OpenAI from "openai";

const connStr = process.env.DATABASE_URL?.replace(/[?&]sslmode=[^&]*/g, "") ?? "";
const isRds = connStr.includes("rds.amazonaws.com");
const pool = new Pool({ connectionString: connStr, ssl: isRds ? { rejectUnauthorized: false } : false });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BATCH = 100;
const MODEL = "text-embedding-3-large";
const DIMS = 1536;

async function embedHotel(hotelId: string, name: string) {
  const { rows: items } = await pool.query(
    "SELECT id::text, text FROM atomic_items WHERE hotel_id = $1 AND embedding IS NULL ORDER BY id",
    [hotelId]
  );
  console.log(`${name}: ${items.length} items to embed`);
  if (items.length === 0) return;

  let done = 0;
  for (let i = 0; i < items.length; i += BATCH) {
    const batch = items.slice(i, i + BATCH);
    const resp = await openai.embeddings.create({
      model: MODEL,
      input: batch.map((r: any) => r.text),
      dimensions: DIMS,
    });
    // Bulk update: build VALUES list and update in one query
    const values: string[] = [];
    const params: any[] = [];
    for (let j = 0; j < batch.length; j++) {
      const vec = `[${resp.data[j].embedding.join(",")}]`;
      const offset = j * 2;
      values.push(`($${offset + 1}::uuid, $${offset + 2}::vector)`);
      params.push(batch[j].id, vec);
    }
    await pool.query(
      `UPDATE atomic_items AS a SET embedding = v.vec FROM (VALUES ${values.join(",")}) AS v(id, vec) WHERE a.id = v.id`,
      params
    );
    done += batch.length;
    if (done % 500 === 0 || done === items.length) {
      console.log(`  ${name}: ${done}/${items.length}`);
    }
  }
}

const hotels = [
  ["58cf3136-df09-49de-bf1d-e44fc011dff8", "LakeHouse Kineret"],
  ["dfbafcf3-0ffa-4dc3-9769-45728e199808", "Brown BoBo"],
  ["4b5694a7-9cc2-46cd-87fe-9a98eb31fd6a", "hotel 87"],
  ["75e034fb-0192-40c8-99d6-149ee038d0d1", "Club La Costa World"],
];

(async () => {
  await Promise.all(hotels.map(([id, name]) => embedHotel(id, name)));
  console.log("All done!");
  await pool.end();
  process.exit(0);
})();
