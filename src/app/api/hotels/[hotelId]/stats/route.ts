import { NextRequest, NextResponse } from 'next/server';
import { computeBaselineStats } from '@/lib/stats';
import { requireHotelAccess } from '@/lib/auth';

/**
 * GET /api/hotels/:hotelId/stats
 *
 * Stage 2: Returns deterministic baseline statistics for a hotel.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ hotelId: string }> }
) {
  const { hotelId } = await params;

  try {
    const authResult = await requireHotelAccess(hotelId);
    if (authResult.error) return authResult.error;

    const stats = await computeBaselineStats(hotelId);
    return NextResponse.json(stats);
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: 'Failed to compute stats' }, { status: 500 });
  }
}
