import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const result = await pool.query('SELECT NOW() AS time');
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      db: { connected: true, serverTime: result.rows[0].time },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { status: 'error', timestamp: new Date().toISOString(), db: { connected: false, error: message } },
      { status: 503 }
    );
  }
}
