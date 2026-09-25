import { NextRequest, NextResponse } from 'next/server';
import { getPintasDana, updatePintasDana } from '@/actions/pintas';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await getPintasDana();
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('API PINTAS GET error:', error);
    return NextResponse.json({ error: 'Failed to fetch PINTAS data' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const result = await updatePintasDana({
      kuotaTersedia: Number(body.kuotaTersedia) || 0,
      infaqMasuk: Number(body.infaqMasuk) || 0,
      tersalurkan: Number(body.tersalurkan) || 0,
      dicadangkan: Number(body.dicadangkan) || 0,
      definisi: body.definisi,
      syaratAdmin: body.syaratAdmin,
      alurPendaftaran: body.alurPendaftaran,
      linkDownload: body.linkDownload,
      linkInformasi: body.linkInformasi,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }
    return NextResponse.json(result.data);
  } catch (error) {
    console.error('API PINTAS PUT error:', error);
    return NextResponse.json({ error: 'Failed to update PINTAS data' }, { status: 500 });
  }
}
