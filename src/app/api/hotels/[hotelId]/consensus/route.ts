import { NextRequest, NextResponse } from 'next/server';
import { runConsensus } from '@/lib/consensus';
import { query } from '@/lib/db';
import { requireHotelAccess } from '@/lib/auth';

/**
 * POST /api/hotels/:hotelId/consensus
 *
 * Stage 4: Trigger multi-model consensus category generation.
 * Calls GPT + Claude in parallel, reconciles proposals, inserts consensus categories.
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
       VALUES ($1, 'running', 'consensus') RETURNING id`,
      [hotelId]
    );

    const result = await runConsensus(hotelId, run.id);

    await query(
      `UPDATE pipeline_runs SET status = 'completed', current_stage = 'consensus' WHERE id = $1`,
      [run.id]
    );

    return NextResponse.json({
      message: 'Consensus complete',
      hotelId,
      pipelineRunId: run.id,
      ...result,
    });
  } catch (error) {
    console.error('Consensus error:', error);
    return NextResponse.json({ error: 'Consensus failed' }, { status: 500 });
  }
}
