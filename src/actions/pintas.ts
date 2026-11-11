'use server';

import {
  getPintasStore,
  savePintasStore,
  calculateBorrowerBalances,
  findBorrowerByIdentifier,
  submitNewSetoran,
  runAutoPurgeExpiredProofs,
  runMonthlyReminders,
  PintasBorrower,
  PintasSetoran,
  PintasDanaConfig,
} from '@/lib/pintas-store';

export async function getPintasDana() {
  try {
    const store = getPintasStore();
    return {
      success: true,
      data: store.config,
    };
  } catch (error) {
    console.error('getPintasDana error:', error);
    return { success: false, error: 'Gagal mengambil data PINTAS' };
  }
}

export async function updatePintasDana(formData: Partial<PintasDanaConfig>) {
  try {
    const store = getPintasStore();
    store.config = {
      ...store.config,
      ...formData,
      updatedAt: new Date().toISOString(),
    };
    savePintasStore(store);

    return {
      success: true,
      data: store.config,
    };
  } catch (error) {
    console.error('updatePintasDana error:', error);
    return { success: false, error: 'Gagal memperbarui data PINTAS' };
  }
}

export async function getPintasBorrowers() {
  try {
    const store = getPintasStore();
    const enriched = store.borrowers.map((b) => ({
      ...b,
      calculation: calculateBorrowerBalances(b),
    }));
    return {
      success: true,
      data: enriched,
    };
  } catch (error) {
    console.error('getPintasBorrowers error:', error);
    return { success: false, error: 'Gagal mengambil data peminjam PINTAS' };
  }
}

export async function getPintasBorrowerByTerm(term: string) {
  try {
    const borrower = findBorrowerByIdentifier(term);
    if (!borrower) {
      return { success: false, error: 'Peminjam tidak ditemukan dengan NPM / NIP tersebut' };
    }
    return {
      success: true,
      data: {
        ...borrower,
        calculation: calculateBorrowerBalances(borrower),
      },
    };
  } catch (error) {
    console.error('getPintasBorrowerByTerm error:', error);
    return { success: false, error: 'Terjadi kesalahan saat mencari peminjam' };
  }
}

export async function submitPintasSetoranAction(
  borrowerId: string,
  payload: {
    nominal: number;
    tanggalSetor: string;
    metode?: string;
    bankPengirim?: string;
    nomorRekeningPengirim?: string;
    namaPengirim?: string;
    buktiTransferUrl: string | null;
    buktiFileName?: string;
    catatan?: string;
  }
) {
  try {
    const res = await submitNewSetoran(borrowerId, payload);
    return res;
  } catch (error) {
    console.error('submitPintasSetoranAction error:', error);
    return { success: false, message: 'Gagal mengirim setoran' };
  }
}

export async function triggerAutoPurgeAction() {
  try {
    const res = await runAutoPurgeExpiredProofs();
    return { success: true, ...res };
  } catch (error) {
    console.error('triggerAutoPurgeAction error:', error);
    return { success: false, error: 'Gagal menjalankan pembersihan berkas' };
  }
}

export async function triggerMonthlyRemindersAction() {
  try {
    const res = await runMonthlyReminders();
    return res;
  } catch (error) {
    console.error('triggerMonthlyRemindersAction error:', error);
    return { success: false, error: 'Gagal mengirim pengingat' };
  }
}
