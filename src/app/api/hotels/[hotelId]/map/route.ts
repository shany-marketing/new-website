import { NextRequest, NextResponse } from 'next/server';
import { runMapping } from '@/lib/mapping';
import { query } from '@/lib/db';
import { requireHotelAccess } from '@/lib/auth';

/**
 * POST /api/hotels/:hotelId/map
 *
 * Stage 5: Trigger semantic mapping of atomic items to consensus categories.
 * Uses GPT-5.4 to classify each item with confidence scoring.
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
       VALUES ($1, 'running', 'mapping') RETURNING id`,
      [hotelId]
    );

    const result = await runMapping(hotelId, run.id);

    await query(
      `UPDATE pipeline_runs SET status = 'completed', current_stage = 'mapping' WHERE id = $1`,
      [run.id]
    );

    return NextResponse.json({
      message: 'Mapping complete',
      hotelId,
      pipelineRunId: run.id,
      ...result,
    });
  } catch (error) {
    console.error('Mapping error:', error);
    return NextResponse.json({ error: 'Mapping failed' }, { status: 500 });
  }
}
