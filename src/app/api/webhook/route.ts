import { NextRequest, NextResponse } from 'next/server';
import { normalizeBatch } from '@/lib/normalize';
import { insertReviews, getOrCreateHotel } from '@/lib/ingest';
import { enqueue } from '@/lib/queue';
import { query } from '@/lib/db';

/**
 * POST /api/webhook
 *
 * Receives the Apify webhook payload after a Booking Reviews Scraper run completes.
 * Apify sends: { resource: { defaultDatasetId: "..." }, ... }
 * We fetch the dataset, normalize, pseudonymize, insert, and queue decomposition.
 */
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret to prevent unauthorized ingestion
    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (webhookSecret) {
      const authHeader = req.headers.get("x-webhook-secret");
      if (authHeader !== webhookSecret) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json();

    // ── Extract hotel info and reviews from payload ──
    // Support two formats:
    // 1. Direct array of reviews (manual/test)
    // 2. Apify webhook format with dataset ID
    let reviews: Record<string, unknown>[];
    let hotelName: string;
    let bookingUrl: string;

    if (Array.isArray(body.reviews)) {
      // Direct payload (for testing and manual ingestion)
      reviews = body.reviews;
      hotelName = body.hotelName ?? 'Unknown Hotel';
      bookingUrl = body.bookingUrl ?? '';
    } else if (body.resource?.defaultDatasetId) {
      // Apify webhook — fetch reviews from dataset API
      const datasetId = String(body.resource.defaultDatasetId);
      // Validate datasetId format to prevent path traversal
      if (!/^[a-zA-Z0-9~-]+$/.test(datasetId)) {
        return NextResponse.json({ error: 'Invalid dataset ID format' }, { status: 400 });
      }
      const apifyToken = process.env.APIFY_API_TOKEN;
      if (!apifyToken) {
        return NextResponse.json({ error: 'APIFY_API_TOKEN not configured' }, { status: 500 });
      }

      const datasetUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?token=${apifyToken}`;
      const response = await fetch(datasetUrl);
      if (!response.ok) {
        return NextResponse.json({ error: 'Failed to fetch Apify dataset' }, { status: 502 });
      }
      reviews = await response.json();
      hotelName = body.hotelName ?? 'Unknown Hotel';
      bookingUrl = body.bookingUrl ?? '';
    } else {
      return NextResponse.json({ error: 'Invalid payload format' }, { status: 400 });
    }

    if (reviews.length === 0) {
      return NextResponse.json({ message: 'No reviews in payload', inserted: 0 });
    }

    // ── Get or create hotel ──
    const hotelId = await getOrCreateHotel(hotelName, bookingUrl);

    // ── Create pipeline run record ──
    const [run] = await query<{ id: string }>(
      `INSERT INTO pipeline_runs (hotel_id, status, current_stage, reviews_count)
       VALUES ($1, 'running', 'ingestion', $2) RETURNING id`,
      [hotelId, reviews.length]
    );

    // ── Normalize + pseudonymize (12-field isolation + GDPR hash) ──
    const normalized = normalizeBatch(reviews as never[]);

    // ── Insert into database (idempotent via ON CONFLICT) ──
    const { count: inserted } = await insertReviews(hotelId, normalized);

    // ── Update pipeline run ──
    await query(
      `UPDATE pipeline_runs SET reviews_count = $1 WHERE id = $2`,
      [inserted, run.id]
    );

    // ── Queue decomposition task for Stage 3 ──
    if (inserted > 0) {
      await enqueue({
        type: 'DECOMPOSE',
        hotelId,
        payload: { pipelineRunId: run.id, reviewCount: inserted },
      });
    }

    return NextResponse.json({
      message: 'Ingestion complete',
      hotelId,
      pipelineRunId: run.id,
      received: reviews.length,
      normalized: normalized.length,
      inserted,
      skippedDuplicates: normalized.length - inserted,
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
