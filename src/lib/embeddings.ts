import OpenAI from "openai";
import { query } from "./db";
import { updateStageProgress } from "./pipeline-progress";
import { getTrackedOpenAI } from "./ai-cost";

// Module-level context set by generateEmbeddings() for the batch functions
let _embCtx: { hotelId: string; pipelineRunId?: string } = { hotelId: '' };

const BATCH_SIZE = 100;
const EMBEDDING_MODEL = "text-embedding-3-large";
const EMBEDDING_DIMS = 1536; // Truncated via MRL — large model quality at small storage cost
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2000, 5000, 10000]; // exponential backoff

interface AtomicItem {
  id: string;
  text: string;
}

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Call OpenAI embeddings API with retry + exponential backoff. */
async function createEmbeddingsWithRetry(
  texts: string[]
): Promise<OpenAI.Embeddings.CreateEmbeddingResponse> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await getTrackedOpenAI({ hotelId: _embCtx.hotelId, operation: 'embedding', pipelineRunId: _embCtx.pipelineRunId }).embeddings.create({
        model: EMBEDDING_MODEL,
        input: texts,
        dimensions: EMBEDDING_DIMS,
      });
    } catch (err: unknown) {
      const isLast = attempt === MAX_RETRIES;
      const status = (err as { status?: number })?.status;
      // Don't retry on 4xx errors (except 429 rate limit)
      if (status && status >= 400 && status < 500 && status !== 429) throw err;
      if (isLast) throw err;
      const delay = RETRY_DELAYS[attempt] ?? 10000;
      console.warn(`[embeddings] Attempt ${attempt + 1} failed (${status ?? "network"}), retrying in ${delay}ms...`);
      await sleep(delay);
    }
  }
  throw new Error("Unreachable");
}

/** Batch-update embeddings in a single query instead of N individual updates. */
async function batchUpdateEmbeddings(
  batch: AtomicItem[],
  embeddings: number[][]
): Promise<void> {
  // Build a VALUES list: (id, embedding_vector)
  const values: string[] = [];
  const params: (string | number)[] = [];
  for (let j = 0; j < batch.length; j++) {
    const pgVector = `[${embeddings[j].join(",")}]`;
    const idx = j * 2;
    values.push(`($${idx + 1}::uuid, $${idx + 2}::vector)`);
    params.push(batch[j].id, pgVector);
  }

  await query(
    `UPDATE atomic_items AS a
     SET embedding = v.emb
     FROM (VALUES ${values.join(", ")}) AS v(id, emb)
     WHERE a.id = v.id`,
    params
  );
}

/**
 * Generate embeddings for all atomic_items missing them for a given hotel.
 * Uses OpenAI text-embedding-3-large truncated to 1536 dims in batches of 100.
 */
export async function generateEmbeddings(
  hotelId: string,
  runId?: string
): Promise<{ embedded: number; total: number }> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  _embCtx = { hotelId, pipelineRunId: runId };
  // Count total items
  const [{ count: totalStr }] = await query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM atomic_items WHERE hotel_id = $1`,
    [hotelId]
  );
  const total = parseInt(totalStr);

  // Get items missing embeddings
  const items = await query<AtomicItem>(
    `SELECT id::text, text FROM atomic_items
     WHERE hotel_id = $1 AND embedding IS NULL
     ORDER BY id`,
    [hotelId]
  );

  if (items.length === 0) {
    if (runId) await updateStageProgress(runId, "embeddings", 0, 0);
    return { embedded: 0, total };
  }

  let embedded = 0;
  if (runId) await updateStageProgress(runId, "embeddings", 0, items.length);

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const texts = batch.map((item) => item.text);

    const response = await createEmbeddingsWithRetry(texts);

    // Batch-update all embeddings in a single query
    const embeddings = response.data.map((d) => d.embedding);
    await batchUpdateEmbeddings(batch, embeddings);

    embedded += batch.length;
    if (runId) await updateStageProgress(runId, "embeddings", embedded, items.length);

    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < items.length) await sleep(200);
  }

  return { embedded, total };
}

/**
 * Embed a single text query for semantic search.
 */
export async function embedQuery(text: string, hotelId?: string): Promise<number[]> {
  const response = await getTrackedOpenAI({ hotelId: hotelId ?? null, operation: 'embedding' }).embeddings.create({
    model: EMBEDDING_MODEL,
    input: text,
    dimensions: EMBEDDING_DIMS,
  });
  return response.data[0].embedding;
}
