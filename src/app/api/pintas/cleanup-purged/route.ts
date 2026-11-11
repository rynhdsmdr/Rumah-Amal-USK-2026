import { NextRequest, NextResponse } from 'next/server';
import { runAutoPurgeExpiredProofs, getPintasStore, calculateBorrowerBalances } from '@/lib/pintas-store';

export const dynamic = 'force-dynamic';

/**
 * GET: Cek status retensi berkas atau picu pembersihan berkas lunas > 30 hari
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trigger = searchParams.get('trigger');

    if (trigger === 'run') {
      const result = await runAutoPurgeExpiredProofs();
      return NextResponse.json({
        message: 'Pembersihan berkas otomatis selesai dieksekusi.',
        ...result,
      });
    }

    const store = getPintasStore();
    const lunasList = store.borrowers
      .map((b) => ({
        ...b,
        calculation: calculateBorrowerBalances(b),
      }))
      .filter((b) => b.calculation.isLunas);

    return NextResponse.json({
      retentionPolicyDays: 30,
      description:
        'Bukti pembayaran dari peminjam yang sudah berstatus LUNAS akan dihapus otomatis setelah 30 hari dari tanggal pelunasan untuk menghemat ruang penyimpanan.',
      totalPeminjamLunas: lunasList.length,
      borrowers: lunasList.map((b) => ({
        id: b.id,
        identifier: b.identifier,
        nama: b.nama,
        lunasAt: b.lunasAt,
        retentionDaysLeft: b.calculation.retentionDaysLeft,
        isPurged: b.calculation.isPurged,
        totalSetoran: b.setoran.length,
        buktiTersimpan: b.setoran.filter((s) => !s.buktiPurged && s.buktiTransferUrl).length,
      })),
    });
  } catch (err: any) {
    console.error('API /api/pintas/cleanup-purged GET error:', err);
    return NextResponse.json({ error: 'Gagal mengecek status retensi berkas' }, { status: 500 });
  }
}

/**
 * POST: Eksekusi langsung pembersihan bukti berkas yang sudah lewat 30 hari
 */
export async function POST() {
  try {
    const result = await runAutoPurgeExpiredProofs();
    return NextResponse.json({
      success: true,
      message:
        result.purgedCount > 0
          ? `Berhasil membersihkan ${result.purgedCount} bukti transfer dari peminjam lunas yang melebihi masa retensi 30 hari.`
          : 'Tidak ada berkas kedaluwarsa yang perlu dibersihkan saat ini.',
      ...result,
    });
  } catch (err: any) {
    console.error('API /api/pintas/cleanup-purged POST error:', err);
    return NextResponse.json({ error: 'Gagal menjalankan pembersihan berkas' }, { status: 500 });
  }
}

