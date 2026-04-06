import { NextRequest, NextResponse } from 'next/server';
import { runDecomposition } from '@/lib/decompose';
import { query } from '@/lib/db';
import { requireHotelAccess } from '@/lib/auth';

/**
 * POST /api/hotels/:hotelId/decompose
 *
 * Stage 3: Trigger atomic decomposition for a hotel's unprocessed reviews.
 * In production, this is called by the SQS worker. This endpoint exists
 * for manual triggering and testing.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;
    // Create or reuse pipeline run
    const [run] = await query<{ id: string }>(
      `INSERT INTO pipeline_runs (hotel_id, status, current_stage)
       VALUES ($1, 'running', 'decomposition') RETURNING id`,
      [hotelId]
    );

    const itemCount = await runDecomposition(hotelId, run.id);

    return NextResponse.json({
      message: 'Decomposition complete',
      hotelId,
      pipelineRunId: run.id,
      atomicItemsCreated: itemCount,
    });
  } catch (error) {
    console.error('Decomposition error:', error);
    return NextResponse.json({ error: 'Decomposition failed' }, { status: 500 });
  }
}
