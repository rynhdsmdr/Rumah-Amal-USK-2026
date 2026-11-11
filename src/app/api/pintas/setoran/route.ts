import { NextRequest, NextResponse } from 'next/server';
import {
  getPintasBorrowers,
  getPintasBorrowerByTerm,
  submitPintasSetoranAction,
} from '@/actions/pintas';
import {
  getPintasStore,
  savePintasStore,
  calculateBorrowerBalances,
  updatePintasSetoran,
  deletePintasSetoran,
} from '@/lib/pintas-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userTerm = searchParams.get('user');

    if (userTerm) {
      const result = await getPintasBorrowerByTerm(userTerm);
      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 404 });
      }
      return NextResponse.json(result.data);
    }

    const all = await getPintasBorrowers();
    if (!all.success) {
      return NextResponse.json({ error: all.error }, { status: 500 });
    }
    return NextResponse.json(all.data);
  } catch (err: any) {
    console.error('API /api/pintas/setoran GET error:', err);
    return NextResponse.json({ error: 'Gagal mengambil data setoran' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      borrowerId,
      nominal,
      tanggalSetor,
      metode,
      bankPengirim,
      nomorRekeningPengirim,
      namaPengirim,
      buktiTransferUrl,
      buktiFileName,
      catatan,
    } = body;

    if (!borrowerId || !nominal || Number(nominal) <= 0) {
      return NextResponse.json(
        { error: 'ID Peminjam dan nominal setoran valid wajib diisi.' },
        { status: 400 }
      );
    }

    const result = await submitPintasSetoranAction(borrowerId, {
      nominal: Number(nominal),
      tanggalSetor: tanggalSetor || new Date().toISOString().split('T')[0],
      metode,
      bankPengirim,
      nomorRekeningPengirim,
      namaPengirim,
      buktiTransferUrl: buktiTransferUrl || null,
      buktiFileName,
      catatan,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('API /api/pintas/setoran POST error:', err);
    return NextResponse.json({ error: 'Gagal memproses setoran' }, { status: 500 });
  }
}

/**
 * PATCH: Verifikasi atau perbarui status setoran oleh Admin
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { borrowerId, setoranId, status, rejectionReason, verifiedBy } = body;

    if (!borrowerId || !setoranId || !status) {
      return NextResponse.json({ error: 'Parameter tidak lengkap.' }, { status: 400 });
    }

    const store = getPintasStore();
    const borrower = store.borrowers.find((b) => b.id === borrowerId || b.identifier === borrowerId);

    if (!borrower) {
      return NextResponse.json({ error: 'Peminjam tidak ditemukan.' }, { status: 404 });
    }

    const setoran = borrower.setoran.find((s) => s.id === setoranId);
    if (!setoran) {
      return NextResponse.json({ error: 'Data setoran tidak ditemukan.' }, { status: 404 });
    }

    setoran.status = status;
    if (status === 'TERVERIFIKASI') {
      setoran.verifiedAt = new Date().toISOString();
      setoran.verifiedBy = verifiedBy || 'Admin Rumah Amal USK';
      setoran.rejectionReason = null;
    } else if (status === 'DITOLAK') {
      setoran.rejectionReason = rejectionReason || 'Bukti transfer tidak sesuai atau dana belum masuk.';
      setoran.verifiedAt = new Date().toISOString();
      setoran.verifiedBy = verifiedBy || 'Admin Rumah Amal USK';
    }

    // Recalculate
    const calc = calculateBorrowerBalances(borrower);
    if (calc.isLunas) {
      borrower.status = 'LUNAS';
      if (!borrower.lunasAt) {
        borrower.lunasAt = new Date().toISOString();
      }
    } else {
      borrower.status = 'BELUM_LUNAS';
      borrower.lunasAt = null;
    }

    savePintasStore(store);

    return NextResponse.json({
      success: true,
      data: {
        setoran,
        borrower: {
          ...borrower,
          calculation: calculateBorrowerBalances(borrower),
        },
      },
    });
  } catch (err: any) {
    console.error('API /api/pintas/setoran PATCH error:', err);
    return NextResponse.json({ error: 'Gagal memperbarui status setoran' }, { status: 500 });
  }
}

/**
 * PUT: Edit riwayat setoran (nominal, tanggal, catatan, dsb)
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      borrowerId,
      setoranId,
      nominal,
      tanggalSetor,
      catatan,
      metode,
      bankPengirim,
      nomorRekeningPengirim,
      buktiTransferUrl,
      buktiFileName,
    } = body;

    if (!borrowerId || !setoranId) {
      return NextResponse.json(
        { error: 'borrowerId dan setoranId wajib diisi.' },
        { status: 400 }
      );
    }

    const res = await updatePintasSetoran(borrowerId, setoranId, {
      nominal: nominal ? Number(nominal) : undefined,
      tanggalSetor,
      catatan,
      metode,
      bankPengirim,
      nomorRekeningPengirim,
      buktiTransferUrl,
      buktiFileName,
    });

    if (!res.success) {
      return NextResponse.json({ error: res.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: res.message, data: res.data });
  } catch (err: any) {
    console.error('API /api/pintas/setoran PUT error:', err);
    return NextResponse.json({ error: 'Gagal mengedit data setoran' }, { status: 500 });
  }
}

/**
 * DELETE: Hapus riwayat setoran
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { borrowerId, setoranId } = body;

    if (!borrowerId || !setoranId) {
      return NextResponse.json(
        { error: 'borrowerId dan setoranId wajib diisi.' },
        { status: 400 }
      );
    }

    const res = await deletePintasSetoran(borrowerId, setoranId);
    if (!res.success) {
      return NextResponse.json({ error: res.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: res.message });
  } catch (err: any) {
    console.error('API /api/pintas/setoran DELETE error:', err);
    return NextResponse.json({ error: 'Gagal menghapus data setoran' }, { status: 500 });
  }
}


