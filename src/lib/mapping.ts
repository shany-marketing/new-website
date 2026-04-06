import { query } from './db';
import { OpenAIProvider, type MappingDecision } from './llm';
import { updateStageProgress } from './pipeline-progress';

// ── Types ───────────────────────────────────────────────────────────

export interface MappingResult {
  totalMapped: number;
  byClassification: {
    category: number;
    other: number;
    irrelevant: number;
  };
  avgConfidence: number;
}

const BATCH_SIZE = 50;
const CONFIDENCE_THRESHOLD = 0.85;

// ── Main Function ───────────────────────────────────────────────────

/**
 * Stage 5: Semantic mapping of atomic items to consensus categories.
 *
 * 1. Fetches consensus categories for the hotel
 * 2. Fetches unmapped atomic items
 * 3. Batches items and classifies via GPT-5.4
 * 4. Applies confidence threshold (>=0.85 → category, <0.85 → other)
 * 5. Inserts mappings into category_mappings table
 */
export async function runMapping(
  hotelId: string,
  pipelineRunId: string
): Promise<MappingResult> {
  // Update pipeline stage
  await query(
    `UPDATE pipeline_runs SET current_stage = 'mapping' WHERE id = $1`,
    [pipelineRunId]
  );

  // Fetch consensus categories with descriptions
  const categories = await query<{
    id: string;
    label: string;
    sentiment: string;
    description: string;
  }>(
    `SELECT id, label, sentiment, COALESCE(description, label) as description
     FROM consensus_categories
     WHERE hotel_id = $1`,
    [hotelId]
  );

  if (categories.length === 0) {
    console.warn('[mapping] No consensus categories found — run consensus first');
    return { totalMapped: 0, byClassification: { category: 0, other: 0, irrelevant: 0 }, avgConfidence: 0 };
  }

  // Fetch unmapped atomic items (including aspect_key + review rating for mapping signals)
  const items = await query<{
    id: string;
    text: string;
    sentiment: string;
    aspect_key: string | null;
    check_out_date: string | null;
    rating: number | null;
  }>(
    `SELECT ai.id, ai.text, ai.sentiment, ai.aspect_key, ai.check_out_date::text,
            rr.rating
     FROM atomic_items ai
     JOIN raw_reviews rr ON rr.id = ai.raw_review_id
     WHERE ai.hotel_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM category_mappings cm WHERE cm.atomic_item_id = ai.id
       )
     ORDER BY ai.created_at`,
    [hotelId]
  );

  if (items.length === 0) {
    await updateStageProgress(pipelineRunId, "mapping", 0, 0);
    return { totalMapped: 0, byClassification: { category: 0, other: 0, irrelevant: 0 }, avgConfidence: 0 };
  }

  await updateStageProgress(pipelineRunId, "mapping", 0, items.length);

  // Build category lookup by label → id
  const categoryLookup = new Map<string, string>();
  for (const cat of categories) {
    categoryLookup.set(cat.label.toLowerCase(), cat.id);
  }

  // Use OpenAI for mapping (logprobs support)
  const provider = new OpenAIProvider(hotelId, pipelineRunId);

  const counts = { category: 0, other: 0, irrelevant: 0 };
  let totalConfidence = 0;
  let totalMapped = 0;

  // Process in batches
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);

    let decisions: MappingDecision[];
    try {
      decisions = await provider.mapItems(
        batch.map((item) => ({ id: item.id, text: item.text, sentiment: item.sentiment, aspectKey: item.aspect_key, rating: item.rating })),
        categories.map((c) => ({ label: c.label, sentiment: c.sentiment, description: c.description }))
      );
    } catch (err) {
      console.error(`[mapping] Batch ${i / BATCH_SIZE + 1} failed:`, err);
      continue; // Skip failed batch, remaining items stay unmapped for retry
    }

    // Match decisions back to items and build bulk insert rows
    const rows: { hotelId: string; itemId: string; categoryId: string | null; classification: string; confidence: number; checkOutDate: string | null }[] = [];

    for (const decision of decisions) {
      const item = batch.find((b) => b.id === decision.atomicItemId);
      if (!item) continue;

      // Rating-based confidence adjustment: stronger ratings = bigger boost/penalty
      const RATING_BOOST: Record<number, number> = {
        10: 0.30, 9: 0.25, 8: 0.20, 7: 0.15, 6: 0,
        5: 0.10, 4: 0.15, 3: 0.20, 2: 0.25, 1: 0.30,
      };
      let adjustedConfidence = decision.confidence;
      if (item.rating != null && decision.classification === 'category') {
        const boost = RATING_BOOST[Math.round(item.rating)] ?? 0;
        if (boost > 0) {
          const ratingIsPositive = item.rating >= 7;
          const aligned =
            (item.sentiment === 'positive' && ratingIsPositive) ||
            (item.sentiment === 'negative' && !ratingIsPositive);
          if (aligned) {
            adjustedConfidence = Math.min(1.0, adjustedConfidence + boost);
          } else {
            adjustedConfidence = Math.max(0, adjustedConfidence - boost);
          }
        }
      }

      // Apply confidence threshold
      let classification = decision.classification;
      let categoryId: string | null = null;

      if (classification === 'category' && decision.categoryLabel) {
        categoryId = categoryLookup.get(decision.categoryLabel.toLowerCase()) ?? null;

        if (!categoryId) {
          classification = 'other';
        } else if (adjustedConfidence < CONFIDENCE_THRESHOLD) {
          classification = 'other';
          categoryId = null;
        }
      }

      rows.push({ hotelId, itemId: item.id, categoryId, classification, confidence: adjustedConfidence, checkOutDate: item.check_out_date });
      counts[classification as keyof typeof counts]++;
      totalConfidence += adjustedConfidence;
      totalMapped++;
    }

    // Bulk insert all decisions for this batch in one query
    if (rows.length > 0) {
      const values: unknown[] = [];
      const placeholders = rows.map((row, idx) => {
        const base = idx * 6;
        values.push(row.hotelId, row.itemId, row.categoryId, row.classification, row.confidence, row.checkOutDate);
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`;
      });

      try {
        await query(
          `INSERT INTO category_mappings (hotel_id, atomic_item_id, category_id, classification, confidence, check_out_date)
           VALUES ${placeholders.join(', ')}`,
          values
        );
      } catch (err) {
        console.error(`[mapping] Bulk insert failed for batch ${i / BATCH_SIZE + 1}:`, err);
        // Subtract counts since insert failed
        for (const row of rows) {
          counts[row.classification as keyof typeof counts]--;
          totalConfidence -= row.confidence;
          totalMapped--;
        }
      }
    }

    await updateStageProgress(pipelineRunId, "mapping", Math.min(i + BATCH_SIZE, items.length), items.length);
  }

  return {
    totalMapped,
    byClassification: counts,
    avgConfidence: totalMapped > 0 ? Math.round((totalConfidence / totalMapped) * 1000) / 1000 : 0,
  };
}
