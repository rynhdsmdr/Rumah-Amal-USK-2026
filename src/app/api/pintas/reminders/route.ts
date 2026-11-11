import { NextRequest, NextResponse } from 'next/server';
import { runMonthlyReminders, getPintasStore, savePintasStore, calculateBorrowerBalances } from '@/lib/pintas-store';

export const dynamic = 'force-dynamic';

/**
 * GET: Cron scheduler trigger (Vercel Cron / External Cron) atau fetch log pengingat
 * Format Cron: "0 8 1 * *" (Setiap tanggal 1 pukul 08:00 WIB)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const trigger = searchParams.get('trigger');

    const store = getPintasStore();

    if (trigger === 'cron' || trigger === 'run') {
      const result = await runMonthlyReminders();
      return NextResponse.json({
        message: 'Pengingat bulanan berhasil dieksekusi via cron scheduler.',
        ...result,
      });
    }

    // Return current reminder status & logs
    const unpaidBorrowers = store.borrowers
      .map((b) => ({
        ...b,
        calculation: calculateBorrowerBalances(b),
      }))
      .filter((b) => !b.calculation.isLunas);

    return NextResponse.json({
      cronSchedule: '0 8 1 * * (Setiap tanggal 1 awal bulan pukul 08:00 WIB)',
      unpaidCount: unpaidBorrowers.length,
      unpaidBorrowers,
      logs: store.reminderLogs || [],
    });
  } catch (err: any) {
    console.error('API /api/pintas/reminders GET error:', err);
    return NextResponse.json({ error: 'Gagal memproses pengingat bulanan' }, { status: 500 });
  }
}

/**
 * POST: Manual trigger oleh Admin untuk mengirim pengingat ke semua atau satu peminjam
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { borrowerId } = body;

    if (borrowerId) {
      // Send individual reminder
      const store = getPintasStore();
      const borrower = store.borrowers.find((b) => b.id === borrowerId || b.identifier === borrowerId);
      if (!borrower) {
        return NextResponse.json({ error: 'Peminjam tidak ditemukan' }, { status: 404 });
      }

      const calc = calculateBorrowerBalances(borrower);
      if (calc.isLunas) {
        return NextResponse.json(
          { error: 'Peminjam sudah berstatus LUNAS, tidak memerlukan pengingat.' },
          { status: 400 }
        );
      }

      const currentMonthName = new Intl.DateTimeFormat('id-ID', {
        month: 'long',
        year: 'numeric',
      }).format(new Date());

      const nominalRp = new Intl.NumberFormat('id-ID').format(calc.sisaPinjaman);
      const pesan = `Assalamu'alaikum Wr. Wb.\n\nYth. Sdr/i *${borrower.nama}* (${borrower.identifier})\n` +
        `Kami dari *Pengelola Program PINTAS Rumah Amal USK* mengingatkan terkait setoran pinjaman tanpa bunga Anda untuk periode *${currentMonthName}*.\n\n` +
        `• Sisa Pinjaman Anda: *Rp ${nominalRp}*\n` +
        `• Rekening Pembayaran: *BSI 7082305587* a.n Rumah Amal USK\n\n` +
        `Mohon melakukan setoran dan upload bukti transfer melalui link portal:\n` +
        `https://rumahamal.usk.ac.id/program/pinjaman-tanpa-syarat-pintas/setoran?user=${borrower.identifier}\n\n` +
        `Terima kasih atas amanahnya.\n` +
        `_Rumah Amal Masjid Jamik USK_`;

      const gatewayUrl = process.env.WA_SELF_HOSTED_URL || 'http://localhost:3001';
      let sendStatus: 'SENT' | 'SIMULATED' = 'SIMULATED';

      try {
        const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/send-message`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: borrower.noWa, message: pesan }),
        });
        if (res.ok) sendStatus = 'SENT';
      } catch {
        sendStatus = 'SIMULATED';
      }

      borrower.lastReminderSentAt = new Date().toISOString();
      borrower.reminderCount = (borrower.reminderCount || 0) + 1;

      const logItem = {
        id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        borrowerId: borrower.id,
        borrowerName: borrower.nama,
        identifier: borrower.identifier,
        noWa: borrower.noWa,
        sisaPinjaman: calc.sisaPinjaman,
        bulan: currentMonthName,
        sentAt: new Date().toISOString(),
        status: sendStatus,
        pesan,
      };

      store.reminderLogs.unshift(logItem);
      savePintasStore(store);

      return NextResponse.json({
        success: true,
        message: `Pengingat berhasil dikirim ke ${borrower.nama}`,
        log: logItem,
      });
    }

    // Trigger to all unpaid borrowers
    const result = await runMonthlyReminders();
    return NextResponse.json({
      message: `Pengingat berhasil diproses ke ${result.remindersSent} peminjam yang belum lunas.`,
      ...result,
    });
  } catch (err: any) {
    console.error('API /api/pintas/reminders POST error:', err);
    return NextResponse.json({ error: 'Gagal mengirim pengingat' }, { status: 500 });
  }
}
