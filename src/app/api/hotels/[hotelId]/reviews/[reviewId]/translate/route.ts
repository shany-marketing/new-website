import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@/lib/db";
import { requireHotelAccess } from "@/lib/auth";
import { getTrackedOpenAI } from "@/lib/ai-cost";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string; reviewId: string }> }
) {
  const { hotelId, reviewId } = await params;
  const authResult = await requireHotelAccess(hotelId);
  if (authResult.error) return authResult.error;

  try {
    // Get the review
    const review = await queryOne<{
      review_language: string | null;
      review_title: string | null;
      liked_text: string | null;
      disliked_text: string | null;
      ai_response: string | null;
    }>(
      `SELECT review_language, review_title, liked_text, disliked_text, ai_response
       FROM raw_reviews WHERE id = $1 AND hotel_id = $2`,
      [reviewId, hotelId]
    );
    if (!review) {
      return NextResponse.json({ error: "Review not found" }, { status: 404 });
    }
    if (!review.review_language || review.review_language === "en") {
      return NextResponse.json({ error: "Review is already in English" }, { status: 400 });
    }

    // Check cache
    const cached = await queryOne<{
      title_en: string | null;
      liked_text_en: string | null;
      disliked_text_en: string | null;
      response_en: string | null;
    }>(
      `SELECT title_en, liked_text_en, disliked_text_en, response_en FROM review_translations WHERE review_id = $1`,
      [reviewId]
    );
    if (cached) {
      // If response changed since last translation, re-translate only the response
      const needsResponseUpdate = review.ai_response && !cached.response_en;
      if (!needsResponseUpdate) {
        return NextResponse.json({
          titleEn: cached.title_en,
          likedTextEn: cached.liked_text_en,
          dislikedTextEn: cached.disliked_text_en,
          responseEn: cached.response_en,
          cached: true,
        });
      }
    }

    // Build texts to translate (skip ai_response — it's already generated in the review language)
    const textsToTranslate: Record<string, string | null> = {
      title: review.review_title,
      liked_text: review.liked_text,
      disliked_text: review.disliked_text,
    };

    // Translate via OpenAI
    const openai = getTrackedOpenAI({ hotelId, operation: 'translate' });
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a translator. Translate the following hotel review texts to English. Return a JSON object with keys: title_en, liked_text_en, disliked_text_en. If a field's value is null or empty, return null for that key. Preserve the original meaning and tone.",
        },
        {
          role: "user",
          content: JSON.stringify({
            language: review.review_language,
            ...textsToTranslate,
          }),
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content || "{}");
    const titleEn = parsed.title_en || null;
    const likedTextEn = parsed.liked_text_en || null;
    const dislikedTextEn = parsed.disliked_text_en || null;
    const responseEn = review.ai_response || null; // already in target language, no translation needed

    // Cache
    await query(
      `INSERT INTO review_translations (review_id, title_en, liked_text_en, disliked_text_en, response_en)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (review_id) DO UPDATE SET
         title_en = $2, liked_text_en = $3, disliked_text_en = $4, response_en = $5, translated_at = now()`,
      [reviewId, titleEn, likedTextEn, dislikedTextEn, responseEn]
    );

    return NextResponse.json({ titleEn, likedTextEn, dislikedTextEn, responseEn, cached: false });
  } catch (error) {
    console.error("Translation error:", error);
    return NextResponse.json({ error: "Translation failed" }, { status: 500 });
  }
}
