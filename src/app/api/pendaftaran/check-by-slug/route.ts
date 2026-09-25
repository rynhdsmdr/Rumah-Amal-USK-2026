import { NextRequest, NextResponse } from 'next/server';
import { neonPrisma } from '@/lib/neon-prisma';

export const dynamic = 'force-dynamic';

// Pemetaan antara slug program lama (Supabase) dengan slug pendaftaran beasiswa (Neon)
const SLUG_MAP: Record<string, string> = {
  'bpra-ukt': 'bpra-ukt',
  'bpra-biaya-hidup': 'bpra-ukt',
  'pinjaman-tanpa-syarat-pintas': 'pintas',
  'pintas': 'pintas',
  'program-pemberdayaan-ekonomi-masyarakat-dhuafa-p2emd': 'p2emd',
  'p2emd': 'p2emd',
  'beasiswa-orang-tua-asuh-ota': 'beasiswa-ota',
  'beasiswa-ota': 'beasiswa-ota',
  'beasiswa-mualaf': 'beasiswa-mualaf',
  'beasiswa-muallaf': 'beasiswa-mualaf',
  'bantuan-nasi-bungkus': 'bantuan-nasi-bungkus',
  'nasi-bungkus': 'bantuan-nasi-bungkus',
  'ecra': 'ecra',
  'ecra-entrepreneurship-club-rumah-amal': 'ecra',
  'bpmi': 'bpmi',
  'beasiswa-pendidikan-mahasiswa-internasional': 'bpmi',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    if (!slug) {
      return NextResponse.json({ hasRegistration: false });
    }

    const targetNeonSlug = SLUG_MAP[slug] || slug;

    const program = await neonPrisma.programBantuan.findUnique({
      where: { slug: targetNeonSlug },
      select: {
        id: true,
        nama: true,
        slug: true,
        status: true,
        tanggalBuka: true,
        tanggalTutup: true,
      },
    });

    if (!program) {
      return NextResponse.json({ hasRegistration: false });
    }

    return NextResponse.json({
      hasRegistration: true,
      isOpen: program.status === 'dibuka',
      registrationSlug: program.slug,
      programName: program.nama,
      tanggalTutup: program.tanggalTutup,
    });
  } catch (error) {
    console.error('[check-by-slug GET error]', error);
    return NextResponse.json({ hasRegistration: false });
  }
}
