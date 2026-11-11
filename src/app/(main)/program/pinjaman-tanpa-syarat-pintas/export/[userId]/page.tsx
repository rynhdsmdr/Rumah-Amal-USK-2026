'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface SetoranItem {
  id: string;
  nominal: number;
  tanggalSetor: string;
  metode: string;
  status: string;
  buktiPurged: boolean;
  catatan?: string | null;
}

interface BorrowerDetail {
  id: string;
  identifier: string;
  nama: string;
  peran: string;
  unitFakultas: string;
  noWa: string;
  email: string;
  rekeningPenerima: string;
  totalPinjaman: number;
  tanggalPencairan: string;
  tenggatWaktuBulan: number;
  status: string;
  lunasAt?: string | null;
  keteranganPinjaman: string;
  setoran: SetoranItem[];
  calculation: {
    totalSetor: number;
    sisaPinjaman: number;
    isLunas: boolean;
    retentionDaysLeft: number | null;
    isPurged: boolean;
  };
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function ExportUserPintasPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const unwrappedParams = use(params);
  const userId = unwrappedParams.userId;

  const [borrower, setBorrower] = useState<BorrowerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadBorrower() {
      try {
        const res = await fetch(`/api/pintas/setoran?user=${encodeURIComponent(userId)}`);
        if (res.ok) {
          const data = await res.json();
          setBorrower(data);
        } else {
          setError('Data peminjam tidak ditemukan.');
        }
      } catch (err) {
        setError('Gagal memuat dokumen peminjaman.');
      } finally {
        setLoading(false);
      }
    }
    loadBorrower();
  }, [userId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#006b2b]"></div>
      </div>
    );
  }

  if (error || !borrower) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">
          ✕
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Dokumen Tidak Ditemukan</h1>
        <p className="text-sm text-gray-500 mb-6">{error || 'Data peminjam tidak valid.'}</p>
        <Link
          href="/program/pinjaman-tanpa-syarat-pintas/setoran"
          className="px-5 py-2.5 bg-[#006b2b] text-white rounded-xl text-xs font-bold"
        >
          Kembali ke Portal Setoran
        </Link>
      </div>
    );
  }

  const { calculation } = borrower;
  const isLunas = calculation.isLunas;
  const verifiedSetoran = borrower.setoran.filter((s) => s.status === 'TERVERIFIKASI');

  // Nomor surat registrasi resmi
  const regYear = borrower.tanggalPencairan ? borrower.tanggalPencairan.split('-')[0] : '2026';
  const noSurat = `PINTAS/USK/${regYear}/${borrower.identifier}`;

  return (
    <div className="min-h-screen bg-gray-100 py-8 px-4 sm:px-6 print:p-0 print:bg-white font-sans text-gray-900">
      {/* Top Floating Control Bar (Hidden on print) */}
      <div className="max-w-[820px] mx-auto mb-6 flex items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-gray-200/80 shadow-sm print:hidden">
        <Link
          href={`/program/pinjaman-tanpa-syarat-pintas/setoran?user=${borrower.identifier}`}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-[#006b2b] hover:underline"
        >
          ← Kembali ke Detail Peminjam
        </Link>
        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrint}
            className="flex items-center justify-center px-5 py-2 bg-[#006b2b] hover:bg-[#005522] text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98]"
          >
            <span>Cetak / Download PDF (Per User)</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* KERTAS RESMI SURAT (A4 Print Layout)                                      */}
      {/* ========================================================================= */}
      <div className="max-w-[820px] mx-auto bg-white p-8 sm:p-12 rounded-3xl border border-gray-200 shadow-xl print:border-none print:shadow-none print:p-6 print:rounded-none">
        {/* Kop Surat Resmi */}
        <div className="flex items-center justify-between border-b-4 border-double border-[#006b2b] pb-4 mb-6">
          <div className="flex items-center gap-4">
            <Image
              src="/logo/Rumah Amal.png"
              alt="Rumah Amal USK"
              width={160}
              height={50}
              className="h-14 w-auto object-contain"
            />
          </div>
          <div className="text-right">
            <h2 className="text-base sm:text-lg font-black text-[#006b2b] uppercase tracking-wide leading-tight">
              Rumah Amal Masjid Jamik
            </h2>
            <p className="text-xs font-bold text-gray-700">UNIVERSITAS SYIAH KUALA</p>
            <p className="text-[10px] text-gray-500 mt-0.5">
              Komplek Masjid Jamik USK, Kopelma Darussalam, Banda Aceh 23111
            </p>
            <p className="text-[10px] text-gray-500">
              Telp/WA: 08116888123 • Email: rumahamal@usk.ac.id • Web: rumahamal.usk.ac.id
            </p>
          </div>
        </div>

        {/* Judul & Nomor Surat */}
        <div className="text-center my-6">
          <h1 className="text-base sm:text-lg font-black text-gray-900 uppercase tracking-tight underline">
            SURAT KETERANGAN STATUS &amp; REKAPITULASI PINJAMAN
          </h1>
          <p className="text-xs font-semibold text-gray-600 mt-1">
            Program Pinjaman Tanpa Syarat (PINTAS) Rumah Amal USK
          </p>
          <p className="text-xs font-mono font-medium text-gray-500 mt-0.5">
            Nomor Registrasi: <span className="font-bold text-gray-800">{noSurat}</span>
          </p>
        </div>

        {/* Status Stamp Watermark Badge */}
        <div className="my-4 flex items-center justify-between p-4 rounded-2xl border bg-gray-50/70 border-gray-200">
          <div>
            <span className="text-xs font-medium text-gray-500 block">Status Pelunasan Saat Ini:</span>
            <span
              className={`text-lg font-black tracking-wide ${
                isLunas ? 'text-emerald-700' : 'text-amber-600'
              }`}
            >
              {isLunas ? '✓ LUNAS (BEBAS TANGGUNGAN)' : '⏳ BELUM LUNAS (DALAM PROSES ANGSURAN)'}
            </span>
          </div>
          {isLunas && (
            <div className="border-2 border-dashed border-emerald-600 px-3.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 text-center rotate-[-3deg]">
              <span className="text-[11px] font-black uppercase tracking-widest block">LUNAS</span>
              <span className="text-[9px] font-medium">{formatDate(borrower.lunasAt)}</span>
            </div>
          )}
        </div>

        {/* Section 1: Data Identitas Peminjam */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 border-b border-gray-200 pb-1">
            I. Identitas Peminjam
          </h3>
          <table className="w-full text-xs text-gray-800 leading-relaxed">
            <tbody>
              <tr>
                <td className="w-44 py-1 text-gray-500 font-medium">Nama Lengkap</td>
                <td className="w-4 py-1">:</td>
                <td className="py-1 font-bold">{borrower.nama}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500 font-medium">NPM / NIP Pegawai</td>
                <td className="py-1">:</td>
                <td className="py-1 font-mono font-semibold">{borrower.identifier}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500 font-medium">Kategori / Peran</td>
                <td className="py-1">:</td>
                <td className="py-1 font-semibold">{borrower.peran}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500 font-medium">Unit Kerja / Fakultas</td>
                <td className="py-1">:</td>
                <td className="py-1">{borrower.unitFakultas}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500 font-medium">Kontak WhatsApp &amp; Email</td>
                <td className="py-1">:</td>
                <td className="py-1">
                  {borrower.noWa} | {borrower.email}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 2: Data Pinjaman */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 border-b border-gray-200 pb-1">
            II. Data Fasilitas Pinjaman PINTAS
          </h3>
          <table className="w-full text-xs text-gray-800 leading-relaxed">
            <tbody>
              <tr>
                <td className="w-44 py-1 text-gray-500 font-medium">Keperluan / Keterangan</td>
                <td className="w-4 py-1">:</td>
                <td className="py-1">{borrower.keteranganPinjaman}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500 font-medium">Tanggal Pencairan Dana</td>
                <td className="py-1">:</td>
                <td className="py-1 font-medium">{formatDate(borrower.tanggalPencairan)}</td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500 font-medium">Total Nominal Pinjaman</td>
                <td className="py-1">:</td>
                <td className="py-1 font-bold text-gray-900">
                  Rp {formatRupiah(borrower.totalPinjaman)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500 font-medium">Total Telah Disetor</td>
                <td className="py-1">:</td>
                <td className="py-1 font-bold text-[#006b2b]">
                  Rp {formatRupiah(calculation.totalSetor)}
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-500 font-medium">Sisa Tanggungan Pinjaman</td>
                <td className="py-1">:</td>
                <td className="py-1 font-bold text-gray-900">
                  Rp {formatRupiah(calculation.sisaPinjaman)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Section 3: Rekapitulasi Riwayat Setoran */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-2 border-b border-gray-200 pb-1">
            III. Rekapitulasi Transaksi Setoran / Pengembalian
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-gray-200">
              <thead className="bg-gray-100/90 text-gray-700 font-bold border-b border-gray-200">
                <tr>
                  <th className="py-2 px-3 w-10 text-center">No</th>
                  <th className="py-2 px-3">Tanggal Setor</th>
                  <th className="py-2 px-3">Metode &amp; Catatan</th>
                  <th className="py-2 px-3 text-right">Nominal (Rp)</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {borrower.setoran.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-4 text-center text-gray-400 italic">
                      Belum ada transaksi setoran yang tercatat.
                    </td>
                  </tr>
                ) : (
                  borrower.setoran.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="py-2 px-3 text-center text-gray-500 font-mono">{idx + 1}</td>
                      <td className="py-2 px-3 font-medium">{formatDate(item.tanggalSetor)}</td>
                      <td className="py-2 px-3 text-gray-600">
                        <span>{item.metode}</span>
                        {item.catatan && (
                          <span className="block text-[11px] text-gray-400 italic mt-0.5">
                            Ket: {item.catatan}
                          </span>
                        )}
                        {item.buktiPurged && (
                          <span className="inline-block text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded mt-1">
                            Berkas bukti fisik dihapus otomatis (&gt;30 hari lunas)
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-900">
                        Rp {formatRupiah(item.nominal)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'TERVERIFIKASI'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.status === 'DITOLAK'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-gray-50 font-bold border-t border-gray-200">
                <tr>
                  <td colSpan={3} className="py-2.5 px-3 text-right text-gray-700">
                    Total Disetorkan Terverifikasi:
                  </td>
                  <td className="py-2.5 px-3 text-right text-[#006b2b] text-sm">
                    Rp {formatRupiah(calculation.totalSetor)}
                  </td>
                  <td></td>
                </tr>
                <tr>
                  <td colSpan={3} className="py-2 px-3 text-right text-gray-700">
                    Sisa Kewajiban Pinjaman:
                  </td>
                  <td
                    className={`py-2 px-3 text-right text-sm ${
                      calculation.sisaPinjaman === 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    Rp {formatRupiah(calculation.sisaPinjaman)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Catatan Kebijakan Retensi 30 Hari */}
        <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 mb-8 text-[11px] text-emerald-950 leading-relaxed">
          <p className="font-bold mb-1 flex items-center gap-1.5 text-emerald-900">
            <span>🛡️</span> Kebijakan Privasi &amp; Pengamanan Data Rumah Amal USK:
          </p>
          <p>
            1. Rekapitulasi ini bersifat resmi dan diterbitkan sebagai bukti sah pelunasan / status
            pinjaman individu yang bersangkutan.
          </p>
          <p>
            2. Berkas lampiran bukti transfer fisik dari peminjam yang telah berstatus <strong>LUNAS</strong>{' '}
            secara otomatis dihapus dari server dalam kurun waktu <strong>30 hari</strong> demi efisiensi
            dan keamanan data. Data rekam jejak finansial di atas tetap tersimpan permanen di basis data
            keuangan syariah Rumah Amal USK.
          </p>
        </div>

        {/* Tanda Tangan & QR Code Validasi */}
        <div className="grid grid-cols-2 gap-8 items-end pt-4 border-t border-gray-200 text-xs">
          <div>
            <div className="w-24 h-24 border border-gray-300 rounded-xl p-2 flex flex-col items-center justify-center bg-gray-50 mb-2">
              <svg className="w-16 h-16 text-gray-700" viewBox="0 0 24 24" fill="currentColor">
                <path d="M2 2h8v8H2V2zm2 2v4h4V4H4zm10-2h8v8h-8V2zm2 2v4h4V4h-4zM2 14h8v8H2v-8zm2 2v4h4v-4H4zm14-1h2v3h-2v-3zm0 4h2v3h-2v-3zm-4-3h2v1h-2v-1zm0 3h2v2h-2v-2zm-3-3h2v5h-2v-5zM6 6h2v2H6V6zm12 0h2v2h-2V6zM6 18h2v2H6v-2z" />
              </svg>
            </div>
            <p className="text-[10px] text-gray-500 font-mono">
              Dokumen resmi terverifikasi sistem digital Rumah Amal Masjid Jamik USK
            </p>
          </div>

          <div className="text-right">
            <p className="text-gray-600 mb-1">
              Banda Aceh,{' '}
              {new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              }).format(new Date())}
            </p>
            <p className="font-bold text-gray-900 mb-16">
              Pengelola Program PINTAS <br />
              Rumah Amal Masjid Jamik USK
            </p>
            <p className="font-bold text-gray-900 underline">
              Tgk. H. Muhammad Yasir, S.E.
            </p>
            <p className="text-[11px] text-gray-500">Staf Layanan &amp; Penyaluran</p>
          </div>
        </div>
      </div>
    </div>
  );
}

