import { NextRequest, NextResponse } from 'next/server';
import { generateInsights } from '@/lib/insights';
import { query, queryOne } from '@/lib/db';
import { getHotelPlan, canAccess } from '@/lib/plan';
import { requireHotelAccess } from '@/lib/auth';

/**
 * GET /api/hotels/:hotelId/insights
 *
 * Returns cached insights from the most recent completed pipeline run.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;
    const run = await queryOne<{ insights_json: unknown }>(
      `SELECT insights_json
       FROM pipeline_runs
       WHERE hotel_id = $1 AND status = 'completed' AND insights_json IS NOT NULL
       ORDER BY completed_at DESC
       LIMIT 1`,
      [hotelId]
    );

    if (!run?.insights_json) {
      return NextResponse.json({ categoryInsights: [], executiveSummary: null });
    }

    return NextResponse.json(run.insights_json);
  } catch (error) {
    console.error('Insights GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch insights' }, { status: 500 });
  }
}

/**
 * POST /api/hotels/:hotelId/insights
 *
 * Stage 7: Trigger LLM-powered insight generation from temporal data.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const plan = await getHotelPlan(hotelId);
    if (!canAccess(plan, 'insights')) {
      return NextResponse.json(
        { error: 'AI Insights requires a Premium plan' },
        { status: 403 }
      );
    }

    // Check for already-running insight generation
    const running = await queryOne<{ id: string }>(
      `SELECT id FROM pipeline_runs WHERE hotel_id = $1 AND status = 'running' AND current_stage = 'insights' LIMIT 1`,
      [hotelId]
    );
    if (running) {
      return NextResponse.json(
        { error: 'Insight generation is already running', runId: running.id },
        { status: 409 }
      );
    }

    const [run] = await query<{ id: string }>(
      `INSERT INTO pipeline_runs (hotel_id, status, current_stage)
       VALUES ($1, 'running', 'insights') RETURNING id`,
      [hotelId]
    );

    try {
      const result = await generateInsights(hotelId, run.id);

      await query(
        `UPDATE pipeline_runs SET status = 'completed', current_stage = 'insights', completed_at = NOW() WHERE id = $1`,
        [run.id]
      );

      return NextResponse.json(result);
    } catch (insightErr) {
      // Mark the run as failed so it doesn't stay stuck in 'running'
      const message = insightErr instanceof Error ? insightErr.message : 'Unknown error';
      await query(
        `UPDATE pipeline_runs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
        [message, run.id]
      );
      throw insightErr;
    }
  } catch (error) {
    console.error('Insights error:', error);
    return NextResponse.json({ error: 'Insight generation failed' }, { status: 500 });
  }
}
