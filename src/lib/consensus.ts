import { query } from './db';
import {
  getActiveProviders,
  type CategoryProposalResult,
  type ReconciledCategory,
} from './llm';
import { updateStageProgress } from './pipeline-progress';

// ── Types ───────────────────────────────────────────────────────────

export interface ConsensusResult {
  categories: Array<{
    id: string;
    label: string;
    sentiment: 'positive' | 'negative';
    modelVotes: number;
    description: string;
  }>;
  totalProposed: number;
  totalConsensus: number;
  modelsUsed: string[];
}

const MAX_ITEMS_PER_SENTIMENT = 500;

// ── Main Function ───────────────────────────────────────────────────

/**
 * Stage 4: Multi-model consensus category generation.
 *
 * 1. Fetches atomic items for the hotel, split by sentiment
 * 2. Calls each active LLM provider in parallel to propose categories
 * 3. Reconciles proposals via LLM-as-judge (merges semantic duplicates)
 * 4. Filters by required vote threshold (2/2 for two models)
 * 5. Inserts consensus categories into the database
 */
export async function runConsensus(
  hotelId: string,
  pipelineRunId: string
): Promise<ConsensusResult> {
  // Update pipeline stage
  await query(
    `UPDATE pipeline_runs SET current_stage = 'consensus' WHERE id = $1`,
    [pipelineRunId]
  );

  await updateStageProgress(pipelineRunId, "consensus", 0, 1);

  // Fetch atomic items split by sentiment
  const items = await query<{ text: string; sentiment: string }>(
    `SELECT text, sentiment FROM atomic_items WHERE hotel_id = $1 ORDER BY created_at`,
    [hotelId]
  );

  if (items.length === 0) {
    return { categories: [], totalProposed: 0, totalConsensus: 0, modelsUsed: [] };
  }

  let positiveItems = items.filter((i) => i.sentiment === 'positive').map((i) => i.text);
  let negativeItems = items.filter((i) => i.sentiment === 'negative').map((i) => i.text);

  // Sample if too many items
  if (positiveItems.length > MAX_ITEMS_PER_SENTIMENT) {
    positiveItems = sample(positiveItems, MAX_ITEMS_PER_SENTIMENT);
  }
  if (negativeItems.length > MAX_ITEMS_PER_SENTIMENT) {
    negativeItems = sample(negativeItems, MAX_ITEMS_PER_SENTIMENT);
  }

  // Determine target category counts based on item volume (0 if no items)
  const targetPositive = positiveItems.length > 0
    ? Math.min(10, Math.max(2, Math.ceil(positiveItems.length / 2)))
    : 0;
  const targetNegative = negativeItems.length > 0
    ? Math.min(10, Math.max(2, Math.ceil(negativeItems.length / 2)))
    : 0;

  // Use primary provider (OpenAI) for category generation — single model, no reconciliation LLM call
  const providers = getActiveProviders(hotelId, pipelineRunId);
  if (providers.length === 0) {
    throw new Error('No LLM providers available — check API keys in .env.local');
  }

  // Use the first available provider (OpenAI preferred)
  const primaryProvider = providers[0];
  let proposal: CategoryProposalResult;
  try {
    proposal = await primaryProvider.proposeCategories(positiveItems, negativeItems, {
      positive: targetPositive,
      negative: targetNegative,
    });
  } catch (err) {
    // Fallback to second provider if available
    if (providers.length > 1) {
      console.warn(`[consensus] Primary provider ${primaryProvider.modelId} failed, trying fallback:`, err);
      proposal = await providers[1].proposeCategories(positiveItems, negativeItems, {
        positive: targetPositive,
        negative: targetNegative,
      });
    } else {
      throw err;
    }
  }

  if (proposal.categories.length === 0) {
    throw new Error(`[consensus] Provider ${proposal.modelId} returned 0 categories`);
  }

  const modelsUsed = [proposal.modelId];
  const reconciled = proposal.categories.map((c) => ({
    label: c.label,
    sentiment: c.sentiment,
    votes: 1,
    description: c.description,
  }));

  // Clear old categories and mappings for this hotel before inserting new ones
  await query(`DELETE FROM category_mappings WHERE hotel_id = $1`, [hotelId]);
  await query(`DELETE FROM consensus_categories WHERE hotel_id = $1`, [hotelId]);

  const result = await insertCategories(hotelId, reconciled, proposal.categories.length, modelsUsed);
  await updateStageProgress(pipelineRunId, "consensus", 1, 1);
  return result;
}

// ── Helpers ─────────────────────────────────────────────────────────

async function insertCategories(
  hotelId: string,
  reconciled: ReconciledCategory[],
  totalProposed: number,
  modelsUsed: string[]
): Promise<ConsensusResult> {
  const inserted: ConsensusResult['categories'] = [];

  for (const cat of reconciled) {
    const row = await query<{ id: string }>(
      `INSERT INTO consensus_categories (hotel_id, label, sentiment, model_votes, description)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (hotel_id, label) DO UPDATE SET
         model_votes = EXCLUDED.model_votes,
         description = EXCLUDED.description
       RETURNING id`,
      [hotelId, cat.label, cat.sentiment, cat.votes, cat.description]
    );

    if (row.length > 0) {
      inserted.push({
        id: row[0].id,
        label: cat.label,
        sentiment: cat.sentiment as 'positive' | 'negative',
        modelVotes: cat.votes,
        description: cat.description,
      });
    }
  }

  return {
    categories: inserted,
    totalProposed,
    totalConsensus: inserted.length,
    modelsUsed,
  };
}

/**
 * Random sample without replacement.
 */
function sample<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, n);
}
