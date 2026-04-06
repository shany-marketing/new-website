import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';

// ── Interfaces ──────────────────────────────────────────────────────

export interface ProposedCategory {
  label: string;
  sentiment: 'positive' | 'negative';
  description: string;
}

export interface CategoryProposalResult {
  modelId: string;
  categories: ProposedCategory[];
}

export interface MappingDecision {
  atomicItemId: string;
  categoryLabel: string | null;
  classification: 'category' | 'other' | 'irrelevant';
  confidence: number;
}

/**
 * Every LLM provider implements this interface.
 * Adding Gemini/Perplexity later = implement this + register in getActiveProviders().
 */
export interface LLMProvider {
  readonly modelId: string;

  proposeCategories(
    positiveItems: string[],
    negativeItems: string[],
    targetCount: { positive: number; negative: number }
  ): Promise<CategoryProposalResult>;

  mapItems(
    items: Array<{ id: string; text: string; sentiment: string; aspectKey?: string | null; rating?: number | null }>,
    categories: Array<{ label: string; sentiment: string; description: string }>
  ): Promise<MappingDecision[]>;
}

// ── Shared Prompts ──────────────────────────────────────────────────

function buildCategoryProposalPrompt(positiveCount: number, negativeCount: number): string {
  return `You are an expert hotel review analyst. You are given a collection of atomic review items extracted from guest reviews of a hotel. Each item describes a single operational observation (positive or negative).

Your job: identify the TOP recurring THEMES that emerge from these items. These themes will become the hotel's analysis categories.

## RULES:
1. Propose exactly ${positiveCount} POSITIVE categories and ${negativeCount} NEGATIVE categories.
2. Each category must be:
   - SPECIFIC to hotel operations (not generic like "Good" or "Bad")
   - Clearly distinct from other categories (no overlap)
   - Descriptive enough that a human could classify new items into it
3. Name each category in 2-4 words using Title Case (e.g., "Room Cleanliness", "Check-in Speed", "Breakfast Variety").
4. Provide a 1-sentence "description" defining exactly what items belong in this category.
5. Base categories ONLY on themes that appear MULTIPLE TIMES in the items. If there are fewer recurring themes than the target count, propose fewer categories — do NOT invent categories with no supporting items.

## OUTPUT FORMAT:
Return a JSON object with key "categories" containing an array of objects:
{ "label": string, "sentiment": "positive"|"negative", "description": string }

Return ONLY valid JSON. No markdown fences, no explanation, no extra text.`;
}

export const MAPPING_SYSTEM_PROMPT = `You are a hotel review classifier. You will receive:
1. A list of CATEGORIES (each with a label, sentiment, and description)
2. A batch of ATOMIC ITEMS to classify (each with text, sentiment, and an optional aspect_key hint)

For EACH item, determine which category it belongs to.

## RULES:
- An item can ONLY be assigned to a category with MATCHING sentiment (positive item -> positive category, negative item -> negative category)
- The "aspect_key" field is a structured hint from a prior decomposition step (e.g., "bed_comfort", "pool_area"). Use it as a STRONG signal for category matching — if the aspect_key clearly aligns with a category, prefer that match. However, always verify against the item text; the aspect_key alone is not sufficient if the text contradicts it.
- The "rating" field is the guest's numeric score (typically 1-10). Use it as a contextual signal:
  - Rating >= 8: strongly supports positive sentiment — prefer matching to a positive category over "other"
  - Rating <= 4: strongly supports negative sentiment — prefer matching to a negative category over "other"
  - Rating 5-7: neutral zone, rely on text and aspect_key instead
- If an item clearly fits a category, set classification = "category" and provide the exact category label
- If an item is a valid review observation but doesn't fit ANY category well, set classification = "other"
- If an item is noise, generic emotion, or non-actionable (e.g., "Great hotel!", "Never again!"), set classification = "irrelevant"
- confidence is a float from 0.0 to 1.0 — be calibrated:
  - 0.95+ = perfect match, aspect_key aligns AND text clearly belongs
  - 0.85-0.94 = strong match, clearly belongs
  - 0.70-0.84 = plausible match but somewhat ambiguous
  - below 0.70 = weak match, probably should be "other"

## OUTPUT FORMAT:
Return a JSON object with key "mappings" containing an array (same order as input items):
{ "item_id": string, "category": string|null, "classification": "category"|"other"|"irrelevant", "confidence": number }

Return ONLY valid JSON. No markdown fences, no explanation.`;

export const RECONCILIATION_SYSTEM_PROMPT = `You are a category reconciliation engine. You will receive category proposals from multiple AI models analyzing hotel reviews.

Your job:
1. Identify categories from different models that describe the SAME theme (even if worded differently).
2. For each unique theme, choose the CLEAREST and most SPECIFIC label.
3. Count how many models proposed each theme (the "votes").
4. Include a 1-sentence description for each category.

RULES:
- "Room Cleanliness" and "Clean Rooms" = SAME theme (merge, 2 votes)
- "Friendly Staff" and "Staff Helpfulness" = SAME theme (merge, 2 votes)
- "Pool Area" and "Swimming Pool" = SAME theme (merge, 2 votes)
- "Breakfast Quality" and "Breakfast Variety" = DIFFERENT themes (keep separate)
- Do NOT merge categories that are related but distinct.
- Preserve the sentiment field exactly (positive/negative).
- A category proposed by only 1 model gets 1 vote.

OUTPUT: JSON object with key "categories" containing an array of:
{ "label": string, "sentiment": "positive"|"negative", "votes": number, "description": string }

Return ONLY valid JSON. No markdown fences, no explanation.`;

// ── Client Factories ────────────────────────────────────────────────

import { getTrackedOpenAI, getTrackedAnthropic } from './ai-cost';

// ── JSON Parsing Helper ─────────────────────────────────────────────

function parseJSON<T>(raw: string): T {
  // Strip markdown fences if present
  const cleaned = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  return JSON.parse(cleaned);
}

// ── OpenAI Provider ─────────────────────────────────────────────────

export class OpenAIProvider implements LLMProvider {
  readonly modelId = 'gpt-4o';
  constructor(private hotelId?: string, private pipelineRunId?: string) {}

  async proposeCategories(
    positiveItems: string[],
    negativeItems: string[],
    targetCount: { positive: number; negative: number }
  ): Promise<CategoryProposalResult> {
    const systemPrompt = buildCategoryProposalPrompt(targetCount.positive, targetCount.negative);

    const userContent = [
      positiveItems.length > 0
        ? `POSITIVE ITEMS (${positiveItems.length}):\n${positiveItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : '',
      negativeItems.length > 0
        ? `NEGATIVE ITEMS (${negativeItems.length}):\n${negativeItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await getTrackedOpenAI({ hotelId: this.hotelId, operation: 'consensus', pipelineRunId: this.pipelineRunId }).chat.completions.create({
      model: this.modelId,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { modelId: this.modelId, categories: [] };

    try {
      const parsed = parseJSON<{ categories?: ProposedCategory[] }>(content);
      return {
        modelId: this.modelId,
        categories: parsed.categories ?? [],
      };
    } catch {
      console.error(`[llm:${this.modelId}] Failed to parse proposeCategories:`, content);
      return { modelId: this.modelId, categories: [] };
    }
  }

  async mapItems(
    items: Array<{ id: string; text: string; sentiment: string; aspectKey?: string | null; rating?: number | null }>,
    categories: Array<{ label: string; sentiment: string; description: string }>
  ): Promise<MappingDecision[]> {
    const categoryList = categories
      .map((c) => `- "${c.label}" (${c.sentiment}): ${c.description}`)
      .join('\n');

    const itemList = items
      .map((item) => JSON.stringify({
        id: item.id,
        text: item.text,
        sentiment: item.sentiment,
        ...(item.aspectKey ? { aspect_key: item.aspectKey } : {}),
        ...(item.rating != null ? { rating: Number(item.rating) } : {}),
      }))
      .join('\n');

    const response = await getTrackedOpenAI({ hotelId: this.hotelId, operation: 'mapping', pipelineRunId: this.pipelineRunId }).chat.completions.create({
      model: this.modelId,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: MAPPING_SYSTEM_PROMPT },
        {
          role: 'user',
          content: `CATEGORIES:\n${categoryList}\n\nITEMS TO CLASSIFY:\n${itemList}`,
        },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    try {
      const parsed = parseJSON<{ mappings?: Array<Record<string, unknown>> }>(content);
      const rawMappings = parsed.mappings ?? [];
      return rawMappings.map((m) => ({
        atomicItemId: String(m.item_id ?? ''),
        categoryLabel: m.classification === 'category' ? String(m.category ?? '') : null,
        classification: (['category', 'other', 'irrelevant'].includes(String(m.classification))
          ? String(m.classification)
          : 'other') as 'category' | 'other' | 'irrelevant',
        confidence: Number(m.confidence ?? 0),
      }));
    } catch {
      console.error(`[llm:${this.modelId}] Failed to parse mapItems:`, content);
      return [];
    }
  }
}

// ── Anthropic Provider ──────────────────────────────────────────────

export class AnthropicProvider implements LLMProvider {
  readonly modelId = 'claude-sonnet-4-6';
  constructor(private hotelId?: string, private pipelineRunId?: string) {}

  async proposeCategories(
    positiveItems: string[],
    negativeItems: string[],
    targetCount: { positive: number; negative: number }
  ): Promise<CategoryProposalResult> {
    const systemPrompt = buildCategoryProposalPrompt(targetCount.positive, targetCount.negative);

    const userContent = [
      positiveItems.length > 0
        ? `POSITIVE ITEMS (${positiveItems.length}):\n${positiveItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : '',
      negativeItems.length > 0
        ? `NEGATIVE ITEMS (${negativeItems.length}):\n${negativeItems.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
        : '',
    ]
      .filter(Boolean)
      .join('\n\n');

    const response = await getTrackedAnthropic({ hotelId: this.hotelId, operation: 'consensus', pipelineRunId: this.pipelineRunId }).messages.create({
      model: this.modelId,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const content = textBlock && 'text' in textBlock ? textBlock.text : '';
    if (!content) return { modelId: this.modelId, categories: [] };

    try {
      const parsed = parseJSON<{ categories?: ProposedCategory[] }>(content);
      return {
        modelId: this.modelId,
        categories: parsed.categories ?? [],
      };
    } catch {
      console.error(`[llm:${this.modelId}] Failed to parse proposeCategories:`, content);
      return { modelId: this.modelId, categories: [] };
    }
  }

  async mapItems(
    items: Array<{ id: string; text: string; sentiment: string; aspectKey?: string | null; rating?: number | null }>,
    categories: Array<{ label: string; sentiment: string; description: string }>
  ): Promise<MappingDecision[]> {
    const categoryList = categories
      .map((c) => `- "${c.label}" (${c.sentiment}): ${c.description}`)
      .join('\n');

    const itemList = items
      .map((item) => JSON.stringify({
        id: item.id,
        text: item.text,
        sentiment: item.sentiment,
        ...(item.aspectKey ? { aspect_key: item.aspectKey } : {}),
        ...(item.rating != null ? { rating: Number(item.rating) } : {}),
      }))
      .join('\n');

    const response = await getTrackedAnthropic({ hotelId: this.hotelId, operation: 'mapping', pipelineRunId: this.pipelineRunId }).messages.create({
      model: this.modelId,
      max_tokens: 4096,
      system: MAPPING_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `CATEGORIES:\n${categoryList}\n\nITEMS TO CLASSIFY:\n${itemList}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    const content = textBlock && 'text' in textBlock ? textBlock.text : '';
    if (!content) return [];

    try {
      const parsed = parseJSON<{ mappings?: Array<Record<string, unknown>> }>(content);
      const rawMappings = parsed.mappings ?? [];
      return rawMappings.map((m) => ({
        atomicItemId: String(m.item_id ?? ''),
        categoryLabel: m.classification === 'category' ? String(m.category ?? '') : null,
        classification: (['category', 'other', 'irrelevant'].includes(String(m.classification))
          ? String(m.classification)
          : 'other') as 'category' | 'other' | 'irrelevant',
        confidence: Number(m.confidence ?? 0),
      }));
    } catch {
      console.error(`[llm:${this.modelId}] Failed to parse mapItems:`, content);
      return [];
    }
  }
}

// ── Provider Registry ───────────────────────────────────────────────

/**
 * Returns all active LLM providers based on available API keys.
 * Extensible: add new providers here when keys are configured.
 */
export function getActiveProviders(hotelId?: string, pipelineRunId?: string): LLMProvider[] {
  const providers: LLMProvider[] = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push(new OpenAIProvider(hotelId, pipelineRunId));
  }
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push(new AnthropicProvider(hotelId, pipelineRunId));
  }
  // Future: if (process.env.GOOGLE_AI_API_KEY) providers.push(new GeminiProvider());
  // Future: if (process.env.PERPLEXITY_API_KEY) providers.push(new PerplexityProvider());

  return providers;
}

// ── Reconciliation (used by consensus.ts) ───────────────────────────

export interface ReconciledCategory {
  label: string;
  sentiment: 'positive' | 'negative';
  votes: number;
  description: string;
}

/**
 * Reconcile category proposals from multiple models using GPT as arbiter.
 * Merges semantically equivalent labels and counts votes.
 */
export async function reconcileCategories(
  proposals: CategoryProposalResult[],
  requiredVotes: number
): Promise<ReconciledCategory[]> {
  const modelSections = proposals
    .map(
      (p) =>
        `Model "${p.modelId}" proposals:\n${JSON.stringify(p.categories, null, 2)}`
    )
    .join('\n\n');

  const userContent = `${modelSections}\n\nRequired votes for consensus: ${requiredVotes}\nTotal models: ${proposals.length}`;

  try {
    const response = await getTrackedOpenAI({ operation: 'reconcile' }).chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: RECONCILIATION_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return [];

    const parsed = parseJSON<{ categories?: ReconciledCategory[] }>(content);
    const all = parsed.categories ?? [];

    // Filter by required votes
    return all.filter((c) => c.votes >= requiredVotes);
  } catch (err) {
    console.error('[reconcile] LLM reconciliation failed, falling back to naive matching:', err);
    return naiveReconcile(proposals, requiredVotes);
  }
}

/**
 * Fallback: normalize labels and group by exact match.
 */
function naiveReconcile(
  proposals: CategoryProposalResult[],
  requiredVotes: number
): ReconciledCategory[] {
  const buckets = new Map<string, { label: string; sentiment: string; votes: number; description: string }>();

  for (const proposal of proposals) {
    for (const cat of proposal.categories) {
      const key = `${cat.sentiment}::${cat.label.toLowerCase().trim()}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.votes++;
      } else {
        buckets.set(key, {
          label: cat.label,
          sentiment: cat.sentiment,
          votes: 1,
          description: cat.description,
        });
      }
    }
  }

  return [...buckets.values()]
    .filter((b) => b.votes >= requiredVotes)
    .map((b) => ({
      label: b.label,
      sentiment: b.sentiment as 'positive' | 'negative',
      votes: b.votes,
      description: b.description,
    }));
}
