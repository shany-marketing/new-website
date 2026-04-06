import type OpenAI from "openai";
import { query, queryOne } from "./db";
import { HotelResponseSettings, ResponseQualityCriteria } from "@/types/reviews";
import { getTrackedOpenAI } from "./ai-cost";

interface ReviewForResponse {
  id: string;
  likedText: string | null;
  dislikedText: string | null;
  reviewTitle: string | null;
  rating: number | null;
  reviewerDisplayName: string | null;
  reviewLanguage: string | null;
}

export interface StaffActionForResponse {
  categoryLabel: string;
  description: string;
  actionDate: string;
  staffName: string;
}

/**
 * Find staff actions relevant to a specific review.
 *
 * Strategy:
 * 1. If the review has been through the pipeline (has atomic_items → category_mappings),
 *    return only staff actions whose category matches the review's mapped categories.
 *    This is precise: guest complained about "Navigation" → we find actions on "Navigation".
 *
 * 2. If the pipeline hasn't run yet (no atomic_items), return the hotel's most recent
 *    staff actions across all categories. The GPT prompt instructs the model to only
 *    reference actions relevant to the specific review content.
 *
 * 3. If the pipeline ran but no categories matched (e.g., review was all positive),
 *    return empty — no staff actions to mention.
 */
export async function getRelevantStaffActions(
  hotelId: string,
  reviewId: string
): Promise<StaffActionForResponse[]> {
  // Try precise matching: review → atomic_items → category_mappings → staff_actions
  const categoryMatched = await query<{
    category_label: string;
    description: string;
    action_date: string;
    staff_name: string;
  }>(
    `SELECT cc.label AS category_label,
            sa.description,
            sa.action_date::text AS action_date,
            sa.staff_name
     FROM staff_actions sa
     JOIN consensus_categories cc ON cc.id = sa.category_id
     WHERE sa.hotel_id = $1
       AND cc.id IN (
         SELECT DISTINCT cm.category_id
         FROM category_mappings cm
         JOIN atomic_items ai ON ai.id = cm.atomic_item_id
         WHERE ai.raw_review_id = $2
           AND cm.classification = 'category'
           AND cm.category_id IS NOT NULL
       )
     ORDER BY sa.action_date DESC`,
    [hotelId, reviewId]
  );

  if (categoryMatched.length > 0) {
    return categoryMatched.map((r) => ({
      categoryLabel: r.category_label,
      description: r.description,
      actionDate: r.action_date,
      staffName: r.staff_name,
    }));
  }

  // Check if pipeline has run for this review
  const atomicCount = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count FROM atomic_items WHERE raw_review_id = $1`,
    [reviewId]
  );

  if (atomicCount && atomicCount.count > 0) {
    // Pipeline ran but no matching categories — no relevant actions
    return [];
  }

  // Pipeline hasn't run — return recent actions, let GPT filter by relevance
  const allRecent = await query<{
    category_label: string;
    description: string;
    action_date: string;
    staff_name: string;
  }>(
    `SELECT cc.label AS category_label,
            sa.description,
            sa.action_date::text,
            sa.staff_name
     FROM staff_actions sa
     JOIN consensus_categories cc ON cc.id = sa.category_id
     WHERE sa.hotel_id = $1
     ORDER BY sa.action_date DESC
     LIMIT 15`,
    [hotelId]
  );

  return allRecent.map((r) => ({
    categoryLabel: r.category_label,
    description: r.description,
    actionDate: r.action_date,
    staffName: r.staff_name,
  }));
}

/**
 * Build the staff actions prompt section.
 * Only included when there are actions to mention.
 */
function buildStaffActionsSection(
  staffActions: StaffActionForResponse[],
  lang: string
): string {
  if (staffActions.length === 0) return "";

  const actionLines = staffActions
    .map(
      (a) =>
        `- [${a.categoryLabel}] (${a.actionDate}): ${a.description}`
    )
    .join("\n");

  return `
ACTIONS TAKEN BY HOTEL MANAGEMENT:
The hotel team has taken the following actions to address guest concerns:
${actionLines}

INSTRUCTIONS FOR USING ACTIONS:
- ONLY mention actions that are DIRECTLY relevant to THIS guest's specific complaints
- If the guest did NOT complain about a topic, do NOT mention the action for it
- Phrase naturally, e.g. "We're pleased to share that we've since ${lang === "Hebrew" ? "implemented improvements" : "added"}..." or "Based on valued feedback, we have..."
- Do NOT list actions mechanically — weave them into the response naturally
- This makes the response personal and shows the hotel listens and acts on feedback
`;
}

/**
 * Detect auto-generated or non-real reviewer names (e.g. "Excursion26866966301",
 * "Tour217135", "User_abc123") and return "Guest" instead.
 */
function sanitizeGuestName(raw: string | null): string {
  if (!raw || !raw.trim()) return "Guest";
  const name = raw.trim();
  // Mostly digits (e.g. "26866966301")
  if (/^\d+$/.test(name)) return "Guest";
  // Word + long digit suffix (e.g. "Excursion26866966301", "Tour217135")
  if (/^[A-Za-z]+\d{5,}$/.test(name)) return "Guest";
  // Underscore/dash-separated with digits (e.g. "User_abc123", "guest-38291")
  if (/^[A-Za-z]+[_-]\w*\d{3,}/i.test(name)) return "Guest";
  // Single word that is very long with mixed case/digits (e.g. "aB3xQ9zK2mW")
  if (!/\s/.test(name) && /\d/.test(name) && name.length > 12) return "Guest";
  return name;
}

/**
 * Generate an AI response for a guest review.
 */
export async function generateAIResponse(
  review: ReviewForResponse,
  settings: HotelResponseSettings,
  customMessage?: string,
  staffActions?: StaffActionForResponse[],
  hotelId?: string
): Promise<string> {
  const guestName = sanitizeGuestName(review.reviewerDisplayName);
  const lang = review.reviewLanguage === "he" ? "Hebrew" : "English";
  const hotelierName = settings.hotelierName || "Hotel Manager";
  const hotelierRole = settings.hotelierRole || "Hotel Manager";

  const reviewContent = [review.reviewTitle, review.likedText, review.dislikedText]
    .filter(Boolean)
    .join("\n");

  const hasActualContent =
    reviewContent.length > 20 &&
    !reviewContent.includes("אין הערות לחוות דעת זו") &&
    !reviewContent.includes("No comments for this review");

  const opening = customMessage?.trim() || "Thank you for your review";

  let customPromptSection = "";
  if (settings.customResponsePrompt) {
    customPromptSection = `\nADDITIONAL INSTRUCTIONS FROM HOTEL:\n${settings.customResponsePrompt}\n`;
  }

  const staffActionsSection = buildStaffActionsSection(staffActions || [], lang);
  const hasStaffActions = (staffActions || []).length > 0;

  let prompt: string;

  if (hasActualContent) {
    prompt = `You are a professional hotel manager. A guest has written this detailed review:

REVIEW CONTENT:
"${reviewContent}"

GUEST RATING: ${review.rating}/10
GUEST NAME: ${guestName}
REVIEW LANGUAGE: ${lang}
${customPromptSection}${staffActionsSection}
Write a VERY CONCISE, professional response (maximum ${hasStaffActions ? "140" : "120"} words) that:

1. STARTS with: "${opening}"
2. ADDRESSES NEGATIVE FEEDBACK FIRST: If there are any complaints, concerns, or negative points mentioned, acknowledge them directly and offer specific solutions or improvements
3. ACKNOWLEDGES POSITIVE FEEDBACK: Thank them for specific positive points they mentioned
4. REFERENCES GUEST BY NAME: Use their name "${guestName}" in the response
5. IS EXTREMELY CONCISE: Use short sentences, avoid filler words, get straight to the point
6. SHOWS EMPATHY: Demonstrate understanding of their experience
7. OFFERS SOLUTIONS: For any negative feedback, provide concrete next steps or improvements${hasStaffActions ? "\n8. MENTIONS RELEVANT ACTIONS: If the guest raised a concern that matches an action the hotel has taken, mention it naturally as proof the hotel listens and improves" : ""}
${hasStaffActions ? "9" : "8"}. INVITES RETURN: End by inviting them to return for a better experience
${hasStaffActions ? "10" : "9"}. Is written in the SAME LANGUAGE as their review (${lang})

CRITICAL REQUIREMENTS:
- MUST address any negative feedback directly and specifically
- MUST be EXTREMELY concise (under ${hasStaffActions ? "140" : "120"} words)
- MUST include the guest's name
- MUST reference specific details from their review
- MUST offer solutions for complaints${hasStaffActions ? "\n- When a complaint matches a recorded hotel action, MUST mention that action as a concrete improvement" : ""}

IMPORTANT: End your response with a professional signature like:
"${hotelierName}
${hotelierRole}"`;
  } else {
    prompt = `You are a professional hotel manager. A guest has left a review with limited details:

REVIEW HEADLINE: "${review.reviewTitle || "No headline provided"}"
GUEST RATING: ${review.rating}/10
GUEST NAME: ${guestName}
REVIEW LANGUAGE: ${lang}
${customPromptSection}${staffActionsSection}
Write a VERY CONCISE, professional response (maximum 80 words) that:

1. STARTS with: "${opening}"
2. REFERENCES GUEST BY NAME: Use their name "${guestName}" in the response
3. ACKNOWLEDGES their ${review.rating}/10 rating appropriately
4. INVITES them to share more details about their experience
5. OFFERS to help with any concerns they might have
6. INVITES RETURN: End by inviting them to return for a better experience
7. Is written in the SAME LANGUAGE as their review (${lang})
8. IS EXTREMELY CONCISE: Use short sentences, avoid filler words

CRITICAL REQUIREMENTS:
- MUST be EXTREMELY concise (under 80 words)
- MUST include the guest's name
- MUST acknowledge their rating appropriately

IMPORTANT: End your response with a professional signature like:
"${hotelierName}
${hotelierRole}"`;
  }

  const completion = await getTrackedOpenAI({ hotelId: hotelId ?? null, operation: 'response' }).chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
  });

  const aiReply = completion.choices[0].message.content?.trim() || "";

  // Save to DB
  await query(
    `UPDATE raw_reviews
     SET ai_response = $1, ai_response_generated_at = NOW(), ai_response_edited = FALSE
     WHERE id = $2`,
    [aiReply, review.id]
  );

  return aiReply;
}

/**
 * Analyze the quality of a response using 12 boolean criteria.
 * Uses heuristic checks instead of an LLM call to save tokens.
 */
export async function analyzeResponseQuality(
  review: ReviewForResponse,
  responseText: string
): Promise<ResponseQualityCriteria | null> {
  const resp = responseText.trim();
  const respLower = resp.toLowerCase();
  const wordCount = resp.split(/\s+/).length;
  const guestName = sanitizeGuestName(review.reviewerDisplayName);
  const reviewContent = [review.reviewTitle, review.likedText, review.dislikedText].filter(Boolean).join(" ");
  const isHebrew = review.reviewLanguage === "he";

  // Heuristic checks
  const scores: Record<string, boolean> = {
    is_response: resp.length > 20,
    is_right_lang: isHebrew
      ? /[\u0590-\u05FF]/.test(resp)
      : /^[A-Za-z]/.test(resp),
    is_answered_positive: review.likedText
      ? respLower.includes("thank") || respLower.includes("glad") || respLower.includes("pleased") || respLower.includes("happy") || /תודה|שמחים|שמחנו/.test(resp)
      : true,
    is_answered_negative: review.dislikedText
      ? respLower.includes("sorry") || respLower.includes("apologize") || respLower.includes("improve") || respLower.includes("address") || /מצטערים|נשפר|נטפל/.test(resp)
      : true,
    is_include_guest_name: resp.includes(guestName) || (guestName === "Guest" && /\bguest\b/i.test(resp)),
    is_include_hotelier_name: /\n[A-Z][a-z]+\s*\n|,\n[A-Z]|\n[\u0590-\u05FF]+\s*$/.test(resp),
    is_kind: respLower.includes("thank") || respLower.includes("appreciate") || respLower.includes("value") || /תודה|מעריכים/.test(resp),
    is_concise: reviewContent.length > 100 ? wordCount <= 150 : wordCount <= 100,
    is_gratitude: respLower.includes("thank") || respLower.includes("grateful") || respLower.includes("appreciate") || /תודה/.test(resp),
    is_include_come_back_asking: respLower.includes("return") || respLower.includes("visit again") || /welcome\s+\w*\s*back/.test(respLower) || respLower.includes("look forward") || respLower.includes("come back") || respLower.includes("next visit") || respLower.includes("stay with us again") || /לחזור|נשמח לארח/.test(resp),
    is_syntax_right: true, // assume correct — we generated it
    is_personal_tone_not_generic: reviewContent.split(/\s+/).slice(0, 20).some((w) => w.length > 3 && respLower.includes(w.toLowerCase())),
  };

  // Calculate score excluding irrelevant criteria
  const excludePositive = !review.likedText || review.likedText.trim() === "";
  const excludeNegative = !review.dislikedText || review.dislikedText.trim() === "";

  const relevantScores: Record<string, boolean> = {};
  if (!excludePositive) relevantScores.is_answered_positive = scores.is_answered_positive;
  if (!excludeNegative) relevantScores.is_answered_negative = scores.is_answered_negative;
  relevantScores.is_response = scores.is_response;
  relevantScores.is_right_lang = scores.is_right_lang;
  relevantScores.is_include_guest_name = scores.is_include_guest_name;
  relevantScores.is_include_hotelier_name = scores.is_include_hotelier_name;
  relevantScores.is_kind = scores.is_kind;
  relevantScores.is_concise = scores.is_concise;
  relevantScores.is_gratitude = scores.is_gratitude;
  relevantScores.is_include_come_back_asking = scores.is_include_come_back_asking;
  relevantScores.is_syntax_right = scores.is_syntax_right;
  relevantScores.is_personal_tone_not_generic = scores.is_personal_tone_not_generic;

  const positives = Object.values(relevantScores).filter(Boolean).length;
  const totalCriteria = Object.keys(relevantScores).length;
  const qualityScore = totalCriteria > 0 ? (positives / totalCriteria) * 100 : 0;

  // Upsert into response_quality
  await query(
    `INSERT INTO response_quality (
      review_id, is_response, is_right_lang, is_answered_positive, is_answered_negative,
      is_include_guest_name, is_include_hotelier_name, is_kind, is_concise, is_gratitude,
      is_include_come_back_asking, is_syntax_right, is_personal_tone_not_generic, quality_score
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
    ON CONFLICT (review_id) DO UPDATE SET
      is_response = EXCLUDED.is_response,
      is_right_lang = EXCLUDED.is_right_lang,
      is_answered_positive = EXCLUDED.is_answered_positive,
      is_answered_negative = EXCLUDED.is_answered_negative,
      is_include_guest_name = EXCLUDED.is_include_guest_name,
      is_include_hotelier_name = EXCLUDED.is_include_hotelier_name,
      is_kind = EXCLUDED.is_kind,
      is_concise = EXCLUDED.is_concise,
      is_gratitude = EXCLUDED.is_gratitude,
      is_include_come_back_asking = EXCLUDED.is_include_come_back_asking,
      is_syntax_right = EXCLUDED.is_syntax_right,
      is_personal_tone_not_generic = EXCLUDED.is_personal_tone_not_generic,
      quality_score = EXCLUDED.quality_score,
      evaluated_at = NOW()`,
    [
      review.id,
      scores.is_response ?? null,
      scores.is_right_lang ?? null,
      scores.is_answered_positive ?? null,
      scores.is_answered_negative ?? null,
      scores.is_include_guest_name ?? null,
      scores.is_include_hotelier_name ?? null,
      scores.is_kind ?? null,
      scores.is_concise ?? null,
      scores.is_gratitude ?? null,
      scores.is_include_come_back_asking ?? null,
      scores.is_syntax_right ?? null,
      scores.is_personal_tone_not_generic ?? null,
      qualityScore,
    ]
  );

  return {
    ...scores,
    quality_score: qualityScore,
  } as ResponseQualityCriteria;
}

/**
 * Multi-turn refinement of a response with conversation context.
 */
export async function refineResponse(
  review: ReviewForResponse,
  settings: HotelResponseSettings,
  conversationHistory: { role: "user" | "assistant"; content: string }[],
  instruction: string,
  staffActions?: StaffActionForResponse[],
  hotelId?: string
): Promise<string> {
  const lang = review.reviewLanguage === "he" ? "Hebrew" : "English";
  const reviewContent = [review.reviewTitle, review.likedText, review.dislikedText]
    .filter(Boolean)
    .join("\n");

  const staffActionsSection = buildStaffActionsSection(staffActions || [], lang);

  const systemPrompt = `You are a professional hotel response writer helping refine a response to a guest review.

ORIGINAL REVIEW (${lang}):
"${reviewContent}"

GUEST: ${sanitizeGuestName(review.reviewerDisplayName)} — Rating: ${review.rating}/10
HOTELIER: ${settings.hotelierName || "Hotel Manager"}, ${settings.hotelierRole || "Hotel Manager"}
${staffActionsSection}
Rules:
- Keep the response concise (under ${(staffActions || []).length > 0 ? "140" : "120"} words)
- Write in ${lang}
- End with the hotelier's signature
- Address any negative feedback specifically
- Include the guest's name${(staffActions || []).length > 0 ? "\n- If the guest raised a concern that matches a recorded hotel action, mention it naturally" : ""}`;

  const messages: OpenAI.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory,
    { role: "user", content: instruction },
  ];

  const completion = await getTrackedOpenAI({ hotelId: hotelId ?? null, operation: 'refine' }).chat.completions.create({
    model: "gpt-4o",
    messages,
    temperature: 0.7,
  });

  const refined = completion.choices[0].message.content?.trim() || "";

  // Save the refined response
  await query(
    `UPDATE raw_reviews
     SET ai_response = $1, ai_response_generated_at = NOW(), ai_response_edited = FALSE
     WHERE id = $2`,
    [refined, review.id]
  );

  return refined;
}

/**
 * Get the current month's response usage for a hotel.
 */
export async function getMonthlyUsage(hotelId: string): Promise<number> {
  const month = new Date().toISOString().slice(0, 7); // YYYY-MM
  const row = await queryOne<{ generation_count: number }>(
    "SELECT generation_count FROM response_usage WHERE hotel_id = $1 AND month = $2",
    [hotelId, month]
  );
  return row?.generation_count ?? 0;
}

/**
 * Increment the monthly response usage counter.
 */
export async function incrementUsage(hotelId: string): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  await query(
    `INSERT INTO response_usage (hotel_id, month, generation_count)
     VALUES ($1, $2, 1)
     ON CONFLICT (hotel_id, month) DO UPDATE SET
       generation_count = response_usage.generation_count + 1`,
    [hotelId, month]
  );
}

/**
 * Decrement the monthly response usage counter (rollback on failure).
 */
export async function decrementUsage(hotelId: string): Promise<void> {
  const month = new Date().toISOString().slice(0, 7);
  await query(
    `UPDATE response_usage SET generation_count = GREATEST(generation_count - 1, 0)
     WHERE hotel_id = $1 AND month = $2`,
    [hotelId, month]
  );
}

/**
 * Get hotel response settings.
 */
export async function getResponseSettings(
  hotelId: string
): Promise<HotelResponseSettings> {
  const hotel = await queryOne<{
    hotelier_name: string | null;
    hotelier_role: string | null;
    custom_response_prompt: string | null;
  }>(
    "SELECT hotelier_name, hotelier_role, custom_response_prompt FROM hotels WHERE id = $1",
    [hotelId]
  );

  return {
    hotelierName: hotel?.hotelier_name ?? null,
    hotelierRole: hotel?.hotelier_role ?? "Hotel Manager",
    customResponsePrompt: hotel?.custom_response_prompt ?? null,
  };
}
