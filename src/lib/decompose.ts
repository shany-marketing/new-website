import { query } from './db';
import { updateStageProgress } from './pipeline-progress';
import { getTrackedOpenAI } from './ai-cost';

/**
 * System prompt for atomic decomposition.
 * Loaded once, reused for every review batch (prompt caching friendly).
 *
 * Enriched with service-merge rule, Hebrew examples, and detailed
 * expectation-gap handling from the Colab reference notebook.
 */
const SYSTEM_PROMPT = `You are a precise hotel review segmentation engine.

Goal:
Split the given review into as many ATOMIC, SPECIFIC feedback items as possible.

Hard rules:
1) Output ONLY feedback items that appear in the text. Do NOT invent details.
2) Keep the original language of each phrase (do not translate). Hebrew stays Hebrew; English stays English.
3) Split ONLY when the feedback refers to DIFFERENT attributes.
   If multiple clauses/sentences describe the SAME underlying issue/topic, keep them as ONE item
   (combine the phrases into one concise snippet).

   Example (HE, same topic -> ONE item):
   "כשהגענו היו המון אנשים... היינו צריכות לשבת ממש בסוף... לא היה מקום לזוז"
   => ONE item about crowding/overcrowding.

   Example (EN, same topic -> ONE item):
   "The pool area was extremely crowded, we had to sit far away and there was no room to move"
   => ONE item about crowding/overcrowding.

4) Specific sub-attributes MUST be separated when they truly differ:
   Example (HE):
   "האוכל טעים ולא מגוון" => two items (food_taste, food_variety)
   Example (EN):
   "The food was tasty but not varied" => two items (food_taste, food_variety)

   Example (HE):
   "נקי אבל לא מתוחזק" => two items (room_cleanliness, room_maintenance)
   Example (EN):
   "Clean but poorly maintained" => two items (room_cleanliness, room_maintenance)

5) Sentiment must be based on meaning, not on where it appears:
   - A positive text can appear under DISLIKED and vice versa.
   - Classify each item correctly as "positive" or "negative".

6) Consistency within ONE review:
   - Use stable snake_case aspect keys (e.g. pool_cleanliness, staff_service, room_comfort).
   - Do NOT output multiple items with the SAME topic and sentiment.
     If the same topic is mentioned more than once, merge into ONE item and concatenate unique phrases
     in natural order (no duplicates).

7) Expectation gap handling (IMPORTANT):
   Define "expectation gap" as: expectation vs reality, surprise, promised/not delivered,
   "not as in photos", "not as advertised", "expected more", etc.

   7.1) If the review contains BOTH:
        (A) a concrete evaluation of the experience (quality/level/etc.)
        AND
        (B) an expectation-gap statement,
        THEN output TWO separate items:
        - one item for (A) the concrete evaluation (regular aspect_key)
        - one item for (B) the expectation gap with aspect_key EXACTLY: expectation_gap

        Example (HE, split into 2):
        "ארוחת בוקר מאוד גרועה והופתענו כי בדרך כלל הרשת ברמה גבוהה"
        => 1) "ארוחת בוקר מאוד גרועה" (aspect_key=breakfast_quality)
           2) "הופתענו כי ציפינו ליותר מהרשת" (aspect_key=expectation_gap)

        Example (EN, split into 2):
        "Breakfast was awful and I was surprised because this chain is usually great"
        => 1) "Breakfast was awful" (aspect_key=breakfast_quality)
           2) "I was surprised because I expected more from the chain" (aspect_key=expectation_gap)

        Example (HE, split into 2):
        "החדרים ממש ברמה נמוכה לא כמו שהיה נראה בתמונות"
        => 1) "החדרים ברמה נמוכה" (aspect_key=room_quality)
           2) "החדרים לא כמו שהיה נראה בתמונות" (aspect_key=expectation_gap)

        Example (EN, split into 2):
        "The rooms were low quality, not like they looked in the photos"
        => 1) "The rooms were low quality" (aspect_key=room_quality)
           2) "Not like they looked in the photos" (aspect_key=expectation_gap)

   7.2) If the statement is ONLY expectation gap (no separate concrete evaluation),
        output ONE item only (aspect_key=expectation_gap). Do NOT split further.

        Example (HE, ONE item):
        "הבטיחו לנו סוויטה ולא קיבלנו"
        => ONE item (aspect_key=expectation_gap)

        Example (EN, ONE item):
        "They promised us a suite but we didn't get it"
        => ONE item (aspect_key=expectation_gap)

8) TITLE may repeat content from other fields; avoid duplicate items across sources.

9) Service / staff handling rule (VERY IMPORTANT):
   If multiple sentences describe the SAME service experience (general praise, specific actions, help given,
   personal appreciation, or gratitude toward a staff member),
   they MUST be merged into ONE single item.

   Do NOT split service into multiple items just because:
   - specific actions are listed (organized, helped, arranged, assisted, pampered)
   - a staff member is mentioned by name
   - there is a concluding thank-you or emotional summary

   These are examples or reinforcements of the SAME service feedback, not separate topics.

   Example (EN, ONE item only - do NOT split):
   "The staff truly made the difference, especially Anna.
   She organized everything for our surprise party, helped us with every request. Thank you Anna!"
   => ONE item only:
   "The staff, especially Anna, provided exceptional service and made our event perfect"
   (aspect_key=staff_service)

   Example (HE, ONE item only - do NOT split):
   "הצוות היה מדהים, במיוחד יוסי. הוא עזר לנו עם כל בקשה, סידר הכל, תודה רבה!"
   => ONE item only (aspect_key=staff_service)

10) Generic emotional expressions without operational content (e.g. "We had an amazing time!", "Worst ever!")
    should be EXCLUDED entirely.

## OUTPUT FORMAT:
Return a JSON object with key "items" containing an array. Each object has:
- "text": the atomic item text (exact words from review, or minimal paraphrase)
- "sentiment": "positive" or "negative"
- "aspect_key": a stable snake_case key describing the topic (e.g. pool_cleanliness, staff_service, room_comfort, breakfast_quality, expectation_gap)

Example:
{"items": [
  {"text": "The pool was dirty", "sentiment": "negative", "aspect_key": "pool_cleanliness"},
  {"text": "Staff was very friendly and helped with reservations", "sentiment": "positive", "aspect_key": "staff_service"}
]}

Return ONLY valid JSON. No markdown, no explanation, no extra keys.`;

interface AtomicItem {
  text: string;
  sentiment: 'positive' | 'negative';
  aspect_key: string;
}

/**
 * Wrap a promise with a timeout. Rejects if the promise doesn't resolve in time.
 */
function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (val) => { clearTimeout(timer); resolve(val); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

/**
 * Normalize an aspect_key to a consistent snake_case format.
 * Aliases common expectation-gap variants to a single canonical key.
 */
function normalizeAspectKey(raw: string): string {
  let key = raw.trim().toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '') || 'other';

  // Normalize common expectation-gap variants
  const expectationGapVariants = new Set([
    'expectations_gap', 'expected_gap', 'expectation_vs_reality',
    'expectation_gap_item', 'gap_expectation', 'expectation_reality_gap',
    'expectation_vs_reality_gap',
  ]);
  if (expectationGapVariants.has(key)) {
    key = 'expectation_gap';
  }

  return key;
}

/**
 * Merge items with the same (sentiment, aspect_key) within a single review.
 * Concatenates unique text snippets to prevent inflated item counts.
 */
function mergeRepeatedAspects(items: AtomicItem[]): AtomicItem[] {
  const merged: AtomicItem[] = [];
  const indexMap = new Map<string, number>();

  for (const item of items) {
    const key = `${item.sentiment}::${item.aspect_key}`;
    const existingIdx = indexMap.get(key);

    if (existingIdx === undefined) {
      indexMap.set(key, merged.length);
      merged.push({ ...item });
    } else {
      const existing = merged[existingIdx];
      // Only append if not already contained (avoid duplicates)
      if (!existing.text.toLowerCase().includes(item.text.toLowerCase())) {
        existing.text = (existing.text.trimEnd() + ' ' + item.text).trim();
      }
    }
  }

  return merged;
}

/**
 * Decompose a single review into atomic items.
 * Accepts title, liked text, and disliked text for richer context.
 * Uses GPT-5.4 at temperature 0 for maximum determinism.
 */
async function decomposeReview(
  titleText: string | null,
  likedText: string | null,
  dislikedText: string | null,
  hotelId: string,
  pipelineRunId: string
): Promise<AtomicItem[]> {
  const parts: string[] = [];
  if (titleText) parts.push(`TITLE: ${titleText}`);
  if (likedText) parts.push(`LIKED: ${likedText}`);
  if (dislikedText) parts.push(`DISLIKED: ${dislikedText}`);

  if (parts.length === 0) return [];

  const userPrompt = parts.join('\n\n');

  const response = await withTimeout(
    getTrackedOpenAI({ hotelId, operation: 'decompose', pipelineRunId }).chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    }),
    30_000,
    'OpenAI decomposition'
  );

  const content = response.choices[0]?.message?.content;
  if (!content) return [];

  try {
    const parsed = JSON.parse(content);
    // Handle: direct array, { items: [] }, { atomic_items: [] }, first array value, or single object
    let rawItems: Record<string, string>[];
    if (Array.isArray(parsed)) {
      rawItems = parsed;
    } else if (parsed.items && Array.isArray(parsed.items)) {
      rawItems = parsed.items;
    } else if (parsed.atomic_items && Array.isArray(parsed.atomic_items)) {
      rawItems = parsed.atomic_items;
    } else {
      const firstArray = Object.values(parsed).find(Array.isArray) as Record<string, string>[] | undefined;
      if (firstArray) {
        rawItems = firstArray;
      } else if (parsed.text || parsed.comment || parsed.description) {
        // Single object response — wrap in array
        rawItems = [parsed];
      } else {
        rawItems = [];
      }
    }

    // Normalize field names and aspect_key
    const cleaned = rawItems
      .map((item) => ({
        text: (item.text ?? item.comment ?? item.description ?? '').trim(),
        sentiment: item.sentiment as 'positive' | 'negative',
        aspect_key: normalizeAspectKey(item.aspect_key ?? 'other'),
      }))
      .filter(
        (item) =>
          item.text.length > 0 &&
          (item.sentiment === 'positive' || item.sentiment === 'negative')
      );

    // Deduplicate same (sentiment, aspect_key) pairs within this review
    return mergeRepeatedAspects(cleaned);
  } catch {
    console.error('Failed to parse decomposition output:', content);
    return [];
  }
}

/**
 * Run Stage 3 decomposition for all unprocessed reviews of a hotel.
 * Inserts atomic items into the database.
 * Returns the total number of atomic items created.
 */
export async function runDecomposition(
  hotelId: string,
  pipelineRunId: string
): Promise<number> {
  // Update pipeline stage
  await query(
    `UPDATE pipeline_runs SET current_stage = 'decomposition' WHERE id = $1`,
    [pipelineRunId]
  );

  // Get reviews that haven't been decomposed yet
  // Include review_title for richer decomposition context
  const reviews = await query<{
    id: string;
    review_title: string | null;
    liked_text: string | null;
    disliked_text: string | null;
    check_out_date: string | null;
  }>(
    `SELECT r.id, r.review_title, r.liked_text, r.disliked_text, r.check_out_date::text
     FROM raw_reviews r
     WHERE r.hotel_id = $1
       AND NOT EXISTS (
         SELECT 1 FROM atomic_items ai WHERE ai.raw_review_id = r.id
       )
       AND (r.liked_text IS NOT NULL OR r.disliked_text IS NOT NULL OR r.review_title IS NOT NULL)
     ORDER BY r.review_date ASC`,
    [hotelId]
  );

  let totalItems = 0;
  let skippedReviews = 0;

  // Process reviews in batches of 5 concurrently for speed
  const BATCH_SIZE = 5;
  const MAX_RETRIES = 2;

  await updateStageProgress(pipelineRunId, "decomposition", 0, reviews.length);

  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map(async (review) => {
        let items: AtomicItem[] = [];
        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            items = await decomposeReview(review.review_title, review.liked_text, review.disliked_text, hotelId, pipelineRunId);
            break;
          } catch (err) {
            if (attempt === MAX_RETRIES) {
              console.error(`Decompose failed after ${MAX_RETRIES + 1} attempts for review ${review.id}:`, String(err));
              skippedReviews++;
              return { reviewId: review.id, items: [] as AtomicItem[], checkOutDate: review.check_out_date };
            }
            // Wait 2s before retry
            await new Promise((r) => setTimeout(r, 2000));
          }
        }
        return { reviewId: review.id, items, checkOutDate: review.check_out_date };
      })
    );

    for (const result of results) {
      if (result.status === 'rejected') {
        skippedReviews++;
        continue;
      }
      const { reviewId, items, checkOutDate } = result.value;
      for (const item of items) {
        await query(
          `INSERT INTO atomic_items (hotel_id, raw_review_id, text, sentiment, aspect_key, check_out_date)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [hotelId, reviewId, item.text, item.sentiment, item.aspect_key, checkOutDate]
        );
        totalItems++;
      }
    }

    await updateStageProgress(pipelineRunId, "decomposition", Math.min(i + batch.length, reviews.length), reviews.length);
  }

  if (skippedReviews > 0) {
    console.warn(`Decomposition skipped ${skippedReviews}/${reviews.length} reviews due to errors`);
  }

  // Update pipeline run with item count
  await query(
    `UPDATE pipeline_runs SET items_count = $1 WHERE id = $2`,
    [totalItems, pipelineRunId]
  );

  return totalItems;
}
