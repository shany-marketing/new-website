import { NextRequest, NextResponse } from 'next/server';
import { runAggregation } from '@/lib/aggregate';
import { query } from '@/lib/db';
import { requireHotelAccess } from '@/lib/auth';

/**
 * POST /api/hotels/:hotelId/aggregate
 *
 * Stage 6: Trigger temporal aggregation — pre-compute monthly stats per category.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;
    const [run] = await query<{ id: string }>(
      `INSERT INTO pipeline_runs (hotel_id, status, current_stage)
       VALUES ($1, 'running', 'aggregation') RETURNING id`,
      [hotelId]
    );

    const result = await runAggregation(hotelId, run.id);

    await query(
      `UPDATE pipeline_runs SET status = 'completed', current_stage = 'aggregation', completed_at = NOW() WHERE id = $1`,
      [run.id]
    );

    return NextResponse.json({
      message: 'Aggregation complete',
      hotelId,
      pipelineRunId: run.id,
      ...result,
    });
  } catch (error) {
    console.error('Aggregation error:', error);
    return NextResponse.json({ error: 'Aggregation failed' }, { status: 500 });
  }
}
