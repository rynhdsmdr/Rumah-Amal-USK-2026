import fs from 'fs';
import path from 'path';
import { deleteStorageFileByUrl } from './supabase';

export type BorrowerRole = 'MAHASISWA' | 'DOSEN' | 'STAFF';
export type LoanStatus = 'BELUM_LUNAS' | 'LUNAS';
export type SetoranStatus = 'MENUNGGU_VERIFIKASI' | 'TERVERIFIKASI' | 'DITOLAK';

export interface PintasSetoran {
  id: string;
  borrowerId: string;
  nominal: number;
  tanggalSetor: string; // YYYY-MM-DD
  metode: string; // e.g. "Transfer BSI Rek. 7082305587"
  bankPengirim?: string;
  nomorRekeningPengirim?: string;
  namaPengirim?: string;
  buktiTransferUrl: string | null;
  buktiFileName?: string;
  buktiPurged: boolean; // True jika sudah >30 hari sejak status LUNAS dan dibersihkan
  purgedAt?: string | null;
  catatan?: string | null;
  status: SetoranStatus;
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  rejectionReason?: string | null;
  createdAt: string;
}

export interface PintasBorrower {
  id: string;
  identifier: string; // NPM atau NIP (e.g. "2108107010001" atau "198504122010121002")
  nama: string;
  peran: BorrowerRole;
  unitFakultas: string;
  noWa: string;
  email: string;
  rekeningPenerima: string;
  totalPinjaman: number;
  tanggalPencairan: string; // YYYY-MM-DD
  tenggatWaktuBulan: number;
  status: LoanStatus;
  lunasAt?: string | null;
  lastReminderSentAt?: string | null;
  reminderCount: number;
  keteranganPinjaman: string;
  setoran: PintasSetoran[];
}

export interface PintasDanaConfig {
  kuotaTersedia: number;
  infaqMasuk: number;
  tersalurkan: number;
  dicadangkan: number;
  pengajuanDisetujui: number;
  pengajuanProses: number;
  definisi: string;
  syaratAdmin: string;
  alurPendaftaran: string;
  linkDownload: string;
  linkDownloadMahasiswa: string;
  linkDownloadDosenStaff: string;
  linkGformMahasiswa: string;
  linkGformDosenStaff: string;
  linkInformasi: string;
  noWaAdmin: string;
  updatedAt: string;
}

export interface ReminderLog {
  id: string;
  borrowerId: string;
  borrowerName: string;
  identifier: string;
  noWa: string;
  sisaPinjaman: number;
  bulan: string;
  sentAt: string;
  status: 'SENT' | 'SIMULATED';
  pesan: string;
}

export interface PintasStoreData {
  config: PintasDanaConfig;
  borrowers: PintasBorrower[];
  reminderLogs: ReminderLog[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'pintas-store.json');

const DEFAULT_DEFINISI =
  'Program bantuan pinjaman tanpa syarat (PINTAS) adalah program bantuan pemberian dana dalam bentuk pinjaman dana tanpa bunga dan tanpa riba kepada civitas akademika Universitas Syiah Kuala (Mahasiswa, Dosen, dan Tenaga Kependidikan/Staff) sesuai dengan kriteria dan jangka waktu pengembalian yang disepakati bersama.';

const DEFAULT_SYARAT = `1. Surat Permohonan Resmi (sesuai peran: Mahasiswa / Dosen / Staff)
2. Surat Rekomendasi (Dosen/Pimpinan Unit Kerja USK)
3. Mahasiswa Aktif atau Dosen/Staff USK
4. Surat Pernyataan tidak merokok dan tidak pacaran (khusus Mahasiswa) atau Surat Kesanggupan Pengembalian (Dosen/Staff)
5. Kartu Identitas Resmi (KTM untuk Mahasiswa / KTP & SK untuk Dosen/Staff)
6. Pas photo berwarna terbaru`;

const DEFAULT_ALUR = `1. Unduh & lengkapi berkas surat permohonan sesuai peran (Mahasiswa atau Dosen/Staff)
2. Isi formulir Google Form pendaftaran resmi Rumah Amal USK
3. Konfirmasi pendaftaran otomatis ke Admin via WhatsApp
4. Verifikasi dokumen & wawancara singkat oleh tim Rumah Amal
5. Penyaluran dana pinjaman ke rekening peminjam
6. Pengembalian setoran berkala melalui portal PINTAS hingga lunas`;

const INITIAL_DATA: PintasStoreData = {
  config: {
    kuotaTersedia: 249500000,
    infaqMasuk: 1250000000,
    tersalurkan: 850500000,
    dicadangkan: 0,
    pengajuanDisetujui: 425,
    pengajuanProses: 75,
    definisi: DEFAULT_DEFINISI,
    syaratAdmin: DEFAULT_SYARAT,
    alurPendaftaran: DEFAULT_ALUR,
    linkDownload: 'https://bit.ly/berkaspintasRA',
    linkDownloadMahasiswa: 'https://drive.google.com/drive/folders/1rJbqX0OU4r66w4YOCWewhFU1gWlh7jFb?usp=drive_link',
    linkDownloadDosenStaff: 'https://drive.google.com/drive/folders/1PSTXp1CRhl-3Fjbf7eNCriLUd4_kHRWe?usp=drive_link',
    linkGformMahasiswa: 'https://docs.google.com/forms/d/e/1FAIpQLSdO4F8634R5P0wXolB_RcVDeF_8TOcCt18EmUxoc71jIXxnfQ/viewform',
    linkGformDosenStaff: 'https://docs.google.com/forms/d/e/1FAIpQLSdXwUWUxmBmRYp15kdQz77Net9yu33EvZZ-JggvzY6UdZttKA/viewform',
    linkInformasi: 'https://api.whatsapp.com/send/?phone=628116888123&text&type=phone_number&app_absent=0',
    noWaAdmin: '628116888123',
    updatedAt: new Date().toISOString(),
  },
  borrowers: [
    {
      id: 'pintas-user-1',
      identifier: '2108107010001',
      nama: 'Ahmad Fauzi',
      peran: 'MAHASISWA',
      unitFakultas: 'Fakultas Matematika dan Ilmu Pengetahuan Alam (Informatika)',
      noWa: '082169001234',
      email: 'ahmad.fauzi@mhs.usk.ac.id',
      rekeningPenerima: 'BSI 7123984721 a.n Ahmad Fauzi',
      totalPinjaman: 3000000,
      tanggalPencairan: '2026-08-10',
      tenggatWaktuBulan: 6,
      status: 'BELUM_LUNAS',
      lunasAt: null,
      lastReminderSentAt: '2026-11-01T08:00:00.000Z',
      reminderCount: 2,
      keteranganPinjaman: 'Bantuan Pembayaran Uang Kuliah Tunggal (UKT) Semester Ganjil',
      setoran: [
        {
          id: 'setoran-101',
          borrowerId: 'pintas-user-1',
          nominal: 1500000,
          tanggalSetor: '2026-09-05',
          metode: 'Transfer BSI ke Rekening PINTAS Rumah Amal (7082305587)',
          bankPengirim: 'Bank Syariah Indonesia (BSI)',
          nomorRekeningPengirim: '7123984721',
          namaPengirim: 'Ahmad Fauzi',
          buktiTransferUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
          buktiFileName: 'bukti_transfer_bsi_1500k.jpg',
          buktiPurged: false,
          purgedAt: null,
          catatan: 'Setoran angsuran pertama (50% dari total)',
          status: 'TERVERIFIKASI',
          verifiedAt: '2026-09-06T10:15:00.000Z',
          verifiedBy: 'Admin Rumah Amal',
          rejectionReason: null,
          createdAt: '2026-09-05T14:20:00.000Z',
        },
      ],
    },
    {
      id: 'pintas-user-2',
      identifier: '198504122010121002',
      nama: 'Dr. Ir. Cut Mutia, M.T.',
      peran: 'DOSEN',
      unitFakultas: 'Fakultas Teknik (Teknik Kimia)',
      noWa: '081269005544',
      email: 'cut.mutia@usk.ac.id',
      rekeningPenerima: 'BSI 1029384756 a.n Cut Mutia',
      totalPinjaman: 5000000,
      tanggalPencairan: '2026-06-01',
      tenggatWaktuBulan: 4,
      status: 'LUNAS',
      // Lunas 5 hari lalu (retensi 25 hari tersisa sebelum auto-purge bukti)
      lunasAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastReminderSentAt: null,
      reminderCount: 0,
      keteranganPinjaman: 'Pinjaman Bantuan Pengobatan Medis Darurat Keluarga',
      setoran: [
        {
          id: 'setoran-201',
          borrowerId: 'pintas-user-2',
          nominal: 2500000,
          tanggalSetor: '2026-07-02',
          metode: 'Transfer BSI ke Rekening PINTAS Rumah Amal (7082305587)',
          bankPengirim: 'BSI',
          nomorRekeningPengirim: '1029384756',
          namaPengirim: 'Cut Mutia',
          buktiTransferUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
          buktiFileName: 'bukti_transfer_bsi_cutmutia_1.jpg',
          buktiPurged: false,
          purgedAt: null,
          catatan: 'Angsuran 1',
          status: 'TERVERIFIKASI',
          verifiedAt: '2026-07-03T09:00:00.000Z',
          verifiedBy: 'Admin Rumah Amal',
          rejectionReason: null,
          createdAt: '2026-07-02T11:00:00.000Z',
        },
        {
          id: 'setoran-202',
          borrowerId: 'pintas-user-2',
          nominal: 2500000,
          tanggalSetor: '2026-08-01',
          metode: 'Transfer BSI ke Rekening PINTAS Rumah Amal (7082305587)',
          bankPengirim: 'BSI',
          nomorRekeningPengirim: '1029384756',
          namaPengirim: 'Cut Mutia',
          buktiTransferUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80',
          buktiFileName: 'bukti_transfer_bsi_cutmutia_pelunasan.jpg',
          buktiPurged: false,
          purgedAt: null,
          catatan: 'Pelunasan pinjaman PINTAS',
          status: 'TERVERIFIKASI',
          verifiedAt: '2026-08-02T08:30:00.000Z',
          verifiedBy: 'Admin Rumah Amal',
          rejectionReason: null,
          createdAt: '2026-08-01T15:45:00.000Z',
        },
      ],
    },
    {
      id: 'pintas-user-3',
      identifier: '2208107010045',
      nama: 'Siti Rahmah',
      peran: 'MAHASISWA',
      unitFakultas: 'Fakultas Ekonomi dan Bisnis (Manajemen)',
      noWa: '085277112233',
      email: 'siti.rahmah@mhs.usk.ac.id',
      rekeningPenerima: 'BSI 7891234560 a.n Siti Rahmah',
      totalPinjaman: 1500000,
      tanggalPencairan: '2026-09-01',
      tenggatWaktuBulan: 4,
      status: 'BELUM_LUNAS',
      lunasAt: null,
      lastReminderSentAt: '2026-11-01T08:00:00.000Z',
      reminderCount: 1,
      keteranganPinjaman: 'Bantuan Pembelian Buku Referensi dan Biaya Praktikum',
      setoran: [],
    },
    {
      id: 'pintas-user-4',
      identifier: '199008152015042001',
      nama: 'Bambang Pratama, S.Kom.',
      peran: 'STAFF',
      unitFakultas: 'Biro Umum dan Keuangan USK',
      noWa: '081399887766',
      email: 'bambang.pratama@usk.ac.id',
      rekeningPenerima: 'BSI 8901234567 a.n Bambang Pratama',
      totalPinjaman: 2000000,
      tanggalPencairan: '2026-05-15',
      tenggatWaktuBulan: 3,
      status: 'LUNAS',
      // Lunas 36 hari lalu (bukti pembayaran sudah otomatis dibersihkan / auto-purged setelah 30 hari)
      lunasAt: new Date(Date.now() - 36 * 24 * 60 * 60 * 1000).toISOString(),
      lastReminderSentAt: null,
      reminderCount: 0,
      keteranganPinjaman: 'Bantuan Kebutuhan Renovasi Rumah Pasca Bencana Angin Kencang',
      setoran: [
        {
          id: 'setoran-401',
          borrowerId: 'pintas-user-4',
          nominal: 2000000,
          tanggalSetor: '2026-08-10',
          metode: 'Transfer BSI ke Rekening PINTAS Rumah Amal (7082305587)',
          bankPengirim: 'BSI',
          nomorRekeningPengirim: '8901234567',
          namaPengirim: 'Bambang Pratama',
          buktiTransferUrl: null, // Telah dibersihkan otomatis
          buktiFileName: 'bukti_transfer_bsi_2000k.jpg',
          buktiPurged: true,
          purgedAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
          catatan: 'Pelunasan Penuh (Berkas lampiran fisik telah dibersihkan otomatis sesuai retensi 30 hari)',
          status: 'TERVERIFIKASI',
          verifiedAt: '2026-08-11T09:00:00.000Z',
          verifiedBy: 'Admin Rumah Amal',
          rejectionReason: null,
          createdAt: '2026-08-10T10:00:00.000Z',
        },
      ],
    },
  ],
  reminderLogs: [
    {
      id: 'rem-1',
      borrowerId: 'pintas-user-1',
      borrowerName: 'Ahmad Fauzi',
      identifier: '2108107010001',
      noWa: '082169001234',
      sisaPinjaman: 1500000,
      bulan: 'November 2026',
      sentAt: '2026-11-01T08:00:00.000Z',
      status: 'SENT',
      pesan: 'Pengingat setoran awal bulan November 2026 untuk PINTAS Rumah Amal USK.',
    },
    {
      id: 'rem-2',
      borrowerId: 'pintas-user-3',
      borrowerName: 'Siti Rahmah',
      identifier: '2208107010045',
      noWa: '085277112233',
      sisaPinjaman: 1500000,
      bulan: 'November 2026',
      sentAt: '2026-11-01T08:00:00.000Z',
      status: 'SENT',
      pesan: 'Pengingat setoran awal bulan November 2026 untuk PINTAS Rumah Amal USK.',
    },
  ],
};

let memoryStore: PintasStoreData | null = null;

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Failed to create data dir:', e);
    }
  }
}

export function getPintasStore(): PintasStoreData {
  if (memoryStore) {
    return memoryStore;
  }

  ensureDataDir();

  if (fs.existsSync(DATA_FILE)) {
    try {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      memoryStore = {
        config: { ...INITIAL_DATA.config, ...parsed.config },
        borrowers: parsed.borrowers || INITIAL_DATA.borrowers,
        reminderLogs: parsed.reminderLogs || INITIAL_DATA.reminderLogs,
      };
      return memoryStore;
    } catch (err) {
      console.error('Error reading pintas store file:', err);
    }
  }

  // Fallback to initial data & write file
  memoryStore = JSON.parse(JSON.stringify(INITIAL_DATA));
  savePintasStore(memoryStore!);
  return memoryStore!;
}

export function savePintasStore(data: PintasStoreData): boolean {
  memoryStore = data;
  try {
    ensureDataDir();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error saving pintas store file:', err);
    return false;
  }
}

/**
 * Menghitung sisa pinjaman seorang peminjam (hanya menghitung setoran yang TERVERIFIKASI)
 */
export function calculateBorrowerBalances(borrower: PintasBorrower) {
  const verifiedSetoran = borrower.setoran.filter((s) => s.status === 'TERVERIFIKASI');
  const totalSetor = verifiedSetoran.reduce((acc, s) => acc + s.nominal, 0);
  const pendingSetoran = borrower.setoran.filter((s) => s.status === 'MENUNGGU_VERIFIKASI');
  const totalPending = pendingSetoran.reduce((acc, s) => acc + s.nominal, 0);
  const sisaPinjaman = Math.max(0, borrower.totalPinjaman - totalSetor);
  const isLunas = sisaPinjaman === 0;

  // Hitung estimasi retensi 30 hari jika sudah lunas
  let retentionDaysLeft: number | null = null;
  let isPurged = false;
  if (isLunas && borrower.lunasAt) {
    const lunasDate = new Date(borrower.lunasAt).getTime();
    const now = Date.now();
    const diffDays = Math.floor((now - lunasDate) / (1000 * 60 * 60 * 24));
    retentionDaysLeft = Math.max(0, 30 - diffDays);
    isPurged = diffDays >= 30;
  }

  return {
    totalSetor,
    totalPending,
    sisaPinjaman,
    isLunas,
    retentionDaysLeft,
    isPurged,
  };
}

/**
 * Mencari data peminjam berdasarkan NPM/NIP atau ID
 */
export function findBorrowerByIdentifier(term: string): PintasBorrower | null {
  const store = getPintasStore();
  const trimmed = term.trim().toLowerCase();
  const found = store.borrowers.find(
    (b) =>
      b.id.toLowerCase() === trimmed ||
      b.identifier.toLowerCase() === trimmed ||
      b.email.toLowerCase() === trimmed
  );
  return found || null;
}

/**
 * Submit Setoran baru oleh peminjam
 */
export async function submitNewSetoran(
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
    autoVerify?: boolean;
  }
): Promise<{ success: boolean; data?: PintasSetoran; message?: string }> {
  const store = getPintasStore();
  const idx = store.borrowers.findIndex((b) => b.id === borrowerId || b.identifier === borrowerId);

  if (idx === -1) {
    return { success: false, message: 'Data peminjam tidak ditemukan' };
  }

  const borrower = store.borrowers[idx];
  const newSetoranId = `setoran-${Date.now()}`;
  const autoVerify = payload.autoVerify ?? true; // Default auto-verify for demonstration ease, but can be controlled

  const newSetoran: PintasSetoran = {
    id: newSetoranId,
    borrowerId: borrower.id,
    nominal: payload.nominal,
    tanggalSetor: payload.tanggalSetor || new Date().toISOString().split('T')[0],
    metode: payload.metode || 'Transfer BSI ke Rekening PINTAS Rumah Amal (7082305587)',
    bankPengirim: payload.bankPengirim || '',
    nomorRekeningPengirim: payload.nomorRekeningPengirim || '',
    namaPengirim: payload.namaPengirim || borrower.nama,
    buktiTransferUrl: payload.buktiTransferUrl || null,
    buktiFileName: payload.buktiFileName || 'bukti_transfer.jpg',
    buktiPurged: false,
    purgedAt: null,
    catatan: payload.catatan || '',
    status: autoVerify ? 'TERVERIFIKASI' : 'MENUNGGU_VERIFIKASI',
    verifiedAt: autoVerify ? new Date().toISOString() : null,
    verifiedBy: autoVerify ? 'Sistem Rumah Amal USK' : null,
    rejectionReason: null,
    createdAt: new Date().toISOString(),
  };

  borrower.setoran.unshift(newSetoran);

  // Recalculate status
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
  return { success: true, data: newSetoran, message: 'Setoran berhasil dicatat!' };
}

/**
 * Edit riwayat setoran
 */
export async function updatePintasSetoran(
  borrowerId: string,
  setoranId: string,
  payload: {
    nominal?: number;
    tanggalSetor?: string;
    catatan?: string | null;
    metode?: string;
    bankPengirim?: string;
    nomorRekeningPengirim?: string;
    buktiTransferUrl?: string | null;
    buktiFileName?: string;
  }
): Promise<{ success: boolean; data?: PintasSetoran; message?: string }> {
  const store = getPintasStore();
  const borrower = store.borrowers.find((b) => b.id === borrowerId || b.identifier === borrowerId);

  if (!borrower) {
    return { success: false, message: 'Peminjam tidak ditemukan.' };
  }

  const setoran = borrower.setoran.find((s) => s.id === setoranId);
  if (!setoran) {
    return { success: false, message: 'Data setoran tidak ditemukan.' };
  }

  if (payload.nominal !== undefined && payload.nominal > 0) {
    setoran.nominal = payload.nominal;
  }
  if (payload.tanggalSetor) {
    setoran.tanggalSetor = payload.tanggalSetor;
  }
  if (payload.catatan !== undefined) {
    setoran.catatan = payload.catatan;
  }
  if (payload.metode) {
    setoran.metode = payload.metode;
  }
  if (payload.bankPengirim !== undefined) {
    setoran.bankPengirim = payload.bankPengirim;
  }
  if (payload.nomorRekeningPengirim !== undefined) {
    setoran.nomorRekeningPengirim = payload.nomorRekeningPengirim;
  }
  if (payload.buktiTransferUrl !== undefined) {
    setoran.buktiTransferUrl = payload.buktiTransferUrl;
    if (payload.buktiFileName) {
      setoran.buktiFileName = payload.buktiFileName;
    }
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
  return { success: true, data: setoran, message: 'Setoran berhasil diperbarui.' };
}

/**
 * Hapus riwayat setoran
 */
export async function deletePintasSetoran(
  borrowerId: string,
  setoranId: string
): Promise<{ success: boolean; message: string }> {
  const store = getPintasStore();
  const borrower = store.borrowers.find((b) => b.id === borrowerId || b.identifier === borrowerId);

  if (!borrower) {
    return { success: false, message: 'Peminjam tidak ditemukan.' };
  }

  const idx = borrower.setoran.findIndex((s) => s.id === setoranId);
  if (idx === -1) {
    return { success: false, message: 'Data setoran tidak ditemukan.' };
  }

  const removed = borrower.setoran[idx];
  if (removed.buktiTransferUrl) {
    try {
      await deleteStorageFileByUrl(removed.buktiTransferUrl);
    } catch (e) {
      console.warn('Gagal menghapus file bukti dari storage:', e);
    }
  }

  borrower.setoran.splice(idx, 1);

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
  return { success: true, message: 'Riwayat setoran berhasil dihapus.' };
}

/**
 * Pembersihan Otomatis Bukti Pembayaran untuk Peminjam yang Lunas > 30 Hari
 */
export async function runAutoPurgeExpiredProofs(): Promise<{
  purgedCount: number;
  details: { borrowerName: string; setoranId: string; daysSinceLunas: number }[];
}> {
  const store = getPintasStore();
  const now = Date.now();
  let purgedCount = 0;
  const details: { borrowerName: string; setoranId: string; daysSinceLunas: number }[] = [];

  for (const borrower of store.borrowers) {
    if (borrower.status === 'LUNAS' && borrower.lunasAt) {
      const lunasDate = new Date(borrower.lunasAt).getTime();
      const diffDays = Math.floor((now - lunasDate) / (1000 * 60 * 60 * 24));

      if (diffDays >= 30) {
        for (const setoran of borrower.setoran) {
          if (!setoran.buktiPurged || setoran.buktiTransferUrl) {
            if (setoran.buktiTransferUrl) {
              try {
                await deleteStorageFileByUrl(setoran.buktiTransferUrl);
              } catch (e) {
                console.warn('Gagal menghapus file dari storage:', e);
              }
            }
            setoran.buktiTransferUrl = null;
            setoran.buktiPurged = true;
            setoran.purgedAt = new Date().toISOString();
            purgedCount++;
            details.push({
              borrowerName: borrower.nama,
              setoranId: setoran.id,
              daysSinceLunas: diffDays,
            });
          }
        }
      }
    }
  }

  if (purgedCount > 0) {
    savePintasStore(store);
  }

  return { purgedCount, details };
}

/**
 * Jalankan Notifikasi Pengingat Bayar Awal Bulan untuk Semua Peminjam yang Belum Lunas
 */
export async function runMonthlyReminders(): Promise<{
  success: boolean;
  remindersSent: number;
  logs: ReminderLog[];
}> {
  const store = getPintasStore();
  const currentMonthName = new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const unpaidBorrowers = store.borrowers.filter((b) => {
    const calc = calculateBorrowerBalances(b);
    return !calc.isLunas && calc.sisaPinjaman > 0;
  });

  const createdLogs: ReminderLog[] = [];
  const gatewayUrl = process.env.WA_SELF_HOSTED_URL || 'http://localhost:3001';

  for (const borrower of unpaidBorrowers) {
    const calc = calculateBorrowerBalances(borrower);
    const nominalRp = new Intl.NumberFormat('id-ID').format(calc.sisaPinjaman);
    const totalRp = new Intl.NumberFormat('id-ID').format(borrower.totalPinjaman);
    const setorRp = new Intl.NumberFormat('id-ID').format(calc.totalSetor);

    const pesan = `Assalamu'alaikum Wr. Wb.\n\nYth. Sdr/i *${borrower.nama}* (${borrower.identifier})\n` +
      `Kami dari *Pengelola Program PINTAS Rumah Amal USK* mengingatkan terkait setoran pinjaman tanpa bunga Anda untuk periode *${currentMonthName}*.\n\n` +
      `📋 *Rincian Pinjaman Anda:*\n` +
      `• Total Pinjaman: Rp ${totalRp}\n` +
      `• Sudah Disetor: Rp ${setorRp}\n` +
      `• *Sisa Pinjaman: Rp ${nominalRp}*\n` +
      `• Rekening Pembayaran: *BSI 7082305587* a.n Rumah Amal USK\n\n` +
      `Mohon melakukan setoran dan mengunggah bukti transfer melalui link portal:\n` +
      `https://rumahamal.usk.ac.id/program/pinjaman-tanpa-syarat-pintas/setoran?user=${borrower.identifier}\n\n` +
      `Terima kasih atas kerja sama dan amanahnya.\n` +
      `_Rumah Amal Masjid Jamik Universitas Syiah Kuala_`;

    let sendStatus: 'SENT' | 'SIMULATED' = 'SIMULATED';

    try {
      const res = await fetch(`${gatewayUrl.replace(/\/$/, '')}/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: borrower.noWa, message: pesan }),
      });
      if (res.ok) {
        sendStatus = 'SENT';
      }
    } catch {
      // Gateway offline or simulated
      sendStatus = 'SIMULATED';
    }

    borrower.lastReminderSentAt = new Date().toISOString();
    borrower.reminderCount = (borrower.reminderCount || 0) + 1;

    const logItem: ReminderLog = {
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

    createdLogs.push(logItem);
    store.reminderLogs.unshift(logItem);
  }

  savePintasStore(store);

  return {
    success: true,
    remindersSent: unpaidBorrowers.length,
    logs: createdLogs,
  };
}

