import { NextResponse } from 'next/server';
import { getNisabConfig } from '@/actions/nisab';

export const revalidate = 0; // Dynamic, no caching

export async function GET() {
  try {
    const config = await getNisabConfig();
    return NextResponse.json(config);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Gagal mengambil data nisab' },
      { status: 500 }
    );
  }
}
