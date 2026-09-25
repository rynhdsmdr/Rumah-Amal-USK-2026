import { NextRequest, NextResponse } from 'next/server';
import { executeQueueProcessing } from '@/lib/worker-queue';

export const maxDuration = 60; // Izinkan hingga 60 detik di serverless environment
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // 1. Verifikasi secret token otorisasi worker
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || new URL(req.url).searchParams.get('secret');

    const expectedSecret = process.env.CRON_SECRET || 'secret';
    if (!token || token !== expectedSecret) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing secret token' }, { status: 401 });
    }

    const result = await executeQueueProcessing();
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[Worker Error /api/worker/proses-antrean]', err);
    return NextResponse.json(
      { error: 'Internal worker execution error: ' + (err?.message || 'Unknown error') },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
