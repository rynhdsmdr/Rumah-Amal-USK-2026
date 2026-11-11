'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface PintasData {
  kuotaTersedia: number;
  infaqMasuk: number;
  tersalurkan: number;
  dicadangkan?: number;
  definisi: string | null;
  syaratAdmin: string | null;
  alurPendaftaran: string | null;
  linkDownload: string | null;
  linkDownloadMahasiswa?: string | null;
  linkDownloadDosenStaff?: string | null;
  linkGformMahasiswa?: string | null;
  linkGformDosenStaff?: string | null;
  linkInformasi: string | null;
  noWaAdmin?: string | null;
}

const DEFAULT_DEFINISI =
  'Program bantuan pinjaman tanpa syarat (PINTAS) adalah program bantuan pemberian dana dalam bentuk pinjaman dana tanpa imbalan/bunga kepada civitas akademika Universitas Syiah Kuala (Mahasiswa, Dosen, dan Staff) sesuai dengan kriteria dengan jangka waktu pengembalian yang disepakati bersama.';

const DEFAULT_SYARAT_LINES = [
  'Surat Permohonan Resmi (sesuai peran: Mahasiswa atau Dosen/Staff)',
  'Surat Rekomendasi (Dosen Pembimbing atau Pimpinan Unit Kerja USK)',
  'Mahasiswa Aktif atau Dosen/Staff Tetap/Kontrak USK',
  'Surat Pernyataan tidak merokok dan tidak pacaran (khusus Mahasiswa) / Surat Kesanggupan (Dosen/Staff)',
  'Kartu Identitas (KTM untuk Mahasiswa / KTP & SK untuk Dosen/Staff)',
  'Pas photo berwarna terbaru',
];

const LINK_DOWNLOAD_DEFAULT = 'https://bit.ly/berkaspintasRA';
const LINK_DOWNLOAD_MHS_DEFAULT =
  'https://drive.google.com/drive/folders/1rJbqX0OU4r66w4YOCWewhFU1gWlh7jFb?usp=drive_link';
const LINK_DOWNLOAD_DOSEN_DEFAULT =
  'https://drive.google.com/drive/folders/1PSTXp1CRhl-3Fjbf7eNCriLUd4_kHRWe?usp=drive_link';
const LINK_GFORM_MHS_DEFAULT =
  'https://docs.google.com/forms/d/e/1FAIpQLSdO4F8634R5P0wXolB_RcVDeF_8TOcCt18EmUxoc71jIXxnfQ/viewform';
const LINK_GFORM_DOSEN_DEFAULT =
  'https://docs.google.com/forms/d/e/1FAIpQLSdXwUWUxmBmRYp15kdQz77Net9yu33EvZZ-JggvzY6UdZttKA/viewform';
const LINK_INFORMASI_DEFAULT =
  'https://api.whatsapp.com/send/?phone=628116888123&text=Halo%20Admin%20Rumah%20Amal%20USK,%20saya%20ingin%20bertanya%20seputar%20Program%20PINTAS';

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(value);
}

export default function PintasPage() {
  const [data, setData] = useState<PintasData>({
    kuotaTersedia: 249500000,
    infaqMasuk: 1250000000,
    tersalurkan: 850500000,
    definisi: DEFAULT_DEFINISI,
    syaratAdmin: DEFAULT_SYARAT_LINES.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    alurPendaftaran: '',
    linkDownload: LINK_DOWNLOAD_DEFAULT,
    linkDownloadMahasiswa: LINK_DOWNLOAD_MHS_DEFAULT,
    linkDownloadDosenStaff: LINK_DOWNLOAD_DOSEN_DEFAULT,
    linkGformMahasiswa: LINK_GFORM_MHS_DEFAULT,
    linkGformDosenStaff: LINK_GFORM_DOSEN_DEFAULT,
    linkInformasi: LINK_INFORMASI_DEFAULT,
    noWaAdmin: '628116888123',
  });
  const [loading, setLoading] = useState(true);

  // Active Role tab in Alur Pendaftaran (Mahasiswa vs Dosen/Staff)
  const [selectedRole, setSelectedRole] = useState<'mahasiswa' | 'dosen_staff'>('mahasiswa');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/pintas');
        if (res.ok) {
          const json = await res.json();
          setData({
            kuotaTersedia: json.kuotaTersedia ?? 249500000,
            infaqMasuk: json.infaqMasuk ?? 1250000000,
            tersalurkan: json.tersalurkan ?? 850500000,
            definisi: json.definisi || DEFAULT_DEFINISI,
            syaratAdmin:
              json.syaratAdmin ||
              DEFAULT_SYARAT_LINES.map((s, i) => `${i + 1}. ${s}`).join('\n'),
            alurPendaftaran: json.alurPendaftaran || '',
            linkDownload: json.linkDownload || LINK_DOWNLOAD_DEFAULT,
            linkDownloadMahasiswa: json.linkDownloadMahasiswa || LINK_DOWNLOAD_MHS_DEFAULT,
            linkDownloadDosenStaff: json.linkDownloadDosenStaff || LINK_DOWNLOAD_DOSEN_DEFAULT,
            linkGformMahasiswa: json.linkGformMahasiswa || LINK_GFORM_MHS_DEFAULT,
            linkGformDosenStaff: json.linkGformDosenStaff || LINK_GFORM_DOSEN_DEFAULT,
            linkInformasi: json.linkInformasi || LINK_INFORMASI_DEFAULT,
            noWaAdmin: json.noWaAdmin || '628116888123',
          });
        }
      } catch (err) {
        console.error('Error fetching PINTAS data:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const totalDana = (data.kuotaTersedia || 0) + (data.tersalurkan || 0);
  const tersalurkanPct =
    totalDana > 0 ? Math.min(100, Math.max(0, (data.tersalurkan / totalDana) * 100)) : 77;

  const syaratLines = (data.syaratAdmin || '')
    .split('\n')
    .map((line) => line.replace(/^\d+[.]\s*/, '').trim())
    .filter(Boolean);

  const displaySyarat = syaratLines.length > 0 ? syaratLines : DEFAULT_SYARAT_LINES;

  const mhsDownloadUrl = data.linkDownloadMahasiswa || LINK_DOWNLOAD_MHS_DEFAULT;
  const dosenDownloadUrl = data.linkDownloadDosenStaff || LINK_DOWNLOAD_DOSEN_DEFAULT;
  const mhsGformUrl = data.linkGformMahasiswa || LINK_GFORM_MHS_DEFAULT;
  const dosenGformUrl = data.linkGformDosenStaff || LINK_GFORM_DOSEN_DEFAULT;
  const infoUrl = data.linkInformasi || LINK_INFORMASI_DEFAULT;
  const adminWa = data.noWaAdmin || '628116888123';

  // Template link konfirmasi WA setelah daftar GForm
  const waConfirmMhs = `https://api.whatsapp.com/send/?phone=${adminWa}&text=${encodeURIComponent(
    'Assalamu’alaikum Admin Rumah Amal USK. Saya telah mengisi Google Form PINTAS untuk kategori Mahasiswa dan mengunggah berkas persyaratan lengkap. Mohon untuk diverifikasi. Terima kasih.'
  )}`;

  const waConfirmDosen = `https://api.whatsapp.com/send/?phone=${adminWa}&text=${encodeURIComponent(
    'Assalamu’alaikum Admin Rumah Amal USK. Saya telah mengisi Google Form PINTAS untuk kategori Dosen/Staff USK dan mengunggah dokumen persyaratan lengkap. Mohon untuk diverifikasi. Terima kasih.'
  )}`;

  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans text-gray-800">
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 py-8 sm:py-10">
        {/* Back link */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/program"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0b6330] hover:underline"
          >
            ← Kembali ke Semua Program
          </Link>

          {/* Quick link to Setoran Portal */}
          <Link
            href="/program/pinjaman-tanpa-syarat-pintas/setoran"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-[#0b6330] border border-emerald-200 text-xs font-bold rounded-xl transition-colors shadow-2xs"
          >
            Portal Setoran &amp; Cek Pinjaman →
          </Link>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 h-24" />
              ))}
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 h-16" />
            <div className="bg-white rounded-2xl border border-gray-200 p-6 h-56" />
          </div>
        ) : (
          <>
            {/* ===== 3 STAT CARDS ===== */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* Card 1: Kuota Tersedia */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs sm:text-[13px] font-medium text-gray-500">
                    Kuota Tersedia
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    viewBox="0 0 24 24"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="3" />
                    <circle cx="12" cy="12" r="2.5" />
                  </svg>
                </div>
                <p className="text-xl sm:text-[25px] font-bold text-[#0b6330] tracking-tight leading-none">
                  Rp{formatRupiah(data.kuotaTersedia)}
                </p>
              </div>

              {/* Card 2: Infaq Masuk */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs sm:text-[13px] font-medium text-gray-500">
                    Infaq Masuk
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    viewBox="0 0 24 24"
                  >
                    <rect x="2" y="6" width="20" height="12" rx="2" />
                    <circle cx="12" cy="12" r="2.5" />
                    <line x1="5" y1="12" x2="6" y2="12" strokeLinecap="round" />
                    <line x1="18" y1="12" x2="19" y2="12" strokeLinecap="round" />
                  </svg>
                </div>
                <p className="text-xl sm:text-[25px] font-bold text-[#0b6330] tracking-tight leading-none">
                  Rp{formatRupiah(data.infaqMasuk)}
                </p>
              </div>

              {/* Card 3: Tersalurkan */}
              <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs sm:text-[13px] font-medium text-gray-500">
                    Tersalurkan
                  </span>
                  <svg
                    className="w-5 h-5 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.5 12.5l2.5 2.5 5-5"
                    />
                  </svg>
                </div>
                <p className="text-xl sm:text-[25px] font-bold text-[#0b6330] tracking-tight leading-none">
                  Rp{formatRupiah(data.tersalurkan)}
                </p>
              </div>
            </div>

            {/* ===== DISTRIBUTION BAR CARD ===== */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-7 mb-6 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mb-4 tracking-tight">
                Distribusi Dana PINTAS
              </h2>
              <div className="w-full h-3.5 sm:h-4 bg-[#86efac] rounded-full overflow-hidden flex p-[1px]">
                <div
                  className="h-full bg-[#006028] rounded-full transition-all duration-700 ease-out"
                  style={{ width: `${tersalurkanPct}%` }}
                />
              </div>
              <div className="flex items-center justify-end gap-5 mt-3.5 text-xs font-medium text-gray-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#006028] inline-block" />
                  Tersalurkan
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#86efac] inline-block" />
                  Tersedia
                </span>
              </div>
            </div>

            {/* ===== BANNER PORTAL SETORAN PEMINJAM ===== */}
            <div className="bg-gradient-to-r from-[#006b2b] to-[#0b6330] rounded-2xl p-6 mb-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-200 block mb-1">
                  Fitur Peminjam PINTAS
                </span>
                <h3 className="text-base sm:text-lg font-black tracking-tight">
                  Sudah Menerima Pinjaman? Lakukan Setoran di Sini
                </h3>
                <p className="text-xs text-emerald-100 mt-1 max-w-xl leading-relaxed">
                  Peminjam dapat menyetorkan cicilan/pelunasan sesuai nominal yang dipinjam, mengunggah bukti transfer, melihat sisa pinjaman, dan mengunduh surat keterangan lunas per user.
                </p>
              </div>
              <Link
                href="/program/pinjaman-tanpa-syarat-pintas/setoran"
                className="px-5 py-3 bg-white hover:bg-emerald-50 text-[#006b2b] text-xs sm:text-sm font-black rounded-xl whitespace-nowrap shadow-sm transition-all active:scale-[0.98] text-center"
              >
                Masuk ke Portal Setoran →
              </Link>
            </div>

            {/* ===== PROGRAM DETAILS & ACTION CARD ===== */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-9 shadow-[0_2px_10px_rgba(0,0,0,0.03)] space-y-8">
              {/* Definisi */}
              <div>
                <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 mb-2">Definisi</h3>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {data.definisi || DEFAULT_DEFINISI}
                </p>
              </div>

              {/* Syarat Administrasi */}
              <div>
                <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 mb-2">
                  Syarat Administrasi
                </h3>
                <ol className="list-decimal list-inside text-xs sm:text-sm text-gray-700 space-y-1.5 leading-normal pl-0.5">
                  {displaySyarat.map((line, idx) => (
                    <li key={idx}>
                      <span className="pl-1 font-medium">{line}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* ========================================================================= */}
              {/* ALUR PENDAFTARAN LENGKAP DENGAN PILIHAN PERAN (MAHASISWA VS DOSEN/STAFF) */}
              {/* ========================================================================= */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <div>
                    <h3 className="text-base sm:text-[17px] font-black text-gray-900">
                      Alur Pendaftaran Program PINTAS
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Ikuti alur pendaftaran sesuai peran Anda (Mahasiswa atau Dosen/Staff USK)
                    </p>
                  </div>

                  {/* Role Selector Tabs */}
                  <div className="flex p-1 bg-gray-100 rounded-xl w-fit shrink-0">
                    <button
                      type="button"
                      onClick={() => setSelectedRole('mahasiswa')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedRole === 'mahasiswa'
                          ? 'bg-[#0b6330] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Mahasiswa USK
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedRole('dosen_staff')}
                      className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        selectedRole === 'dosen_staff'
                          ? 'bg-[#0b6330] text-white shadow-sm'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      Dosen / Staff USK
                    </button>
                  </div>
                </div>

                {/* Step Timeline Sesuai Permintaan User */}
                <div className="space-y-4">
                  {/* Langkah 1: Melengkapi Surat Sesuai Peran */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-[#0b6330] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      1
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                        {selectedRole === 'mahasiswa'
                          ? 'Unduh & Lengkapi Berkas Khusus Mahasiswa'
                          : 'Unduh & Lengkapi Berkas Khusus Dosen / Staff'}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        {selectedRole === 'mahasiswa' ? (
                          <>
                            Pemohon mahasiswa wajib mengunduh berkas template:{' '}
                            <strong>Surat Permohonan Mahasiswa</strong>,{' '}
                            <strong>Surat Rekomendasi Dosen/Staf USK</strong>, dan{' '}
                            <strong>Surat Pernyataan (tidak merokok &amp; tidak berpacaran)</strong>,
                            serta melampirkan fotokopi <strong>KTM Aktif</strong> dan Pasfoto.
                          </>
                        ) : (
                          <>
                            Pemohon dosen atau staf USK wajib mengunduh berkas template:{' '}
                            <strong>Surat Permohonan Pegawai/Dosen</strong>,{' '}
                            <strong>Surat Rekomendasi Pimpinan Unit/Dekan</strong>, dan{' '}
                            <strong>Surat Pernyataan Kesanggupan Pengembalian</strong>, serta
                            melampirkan <strong>KTP &amp; Kartu Pegawai/SK USK</strong>.
                          </>
                        )}
                      </p>

                      <div className="mt-3">
                        <a
                          href={selectedRole === 'mahasiswa' ? mhsDownloadUrl : dosenDownloadUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 bg-[#0b6330] hover:bg-[#084e26] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
                        >
                          <span>
                            {selectedRole === 'mahasiswa'
                              ? 'Download Berkas Mahasiswa (Google Drive)'
                              : 'Download Berkas Dosen & Staff (Google Drive)'}
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Langkah 2: Mengisi Google Form Sesuai Peran */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-[#0b6330] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      2
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                        {selectedRole === 'mahasiswa'
                          ? 'Mengisi Google Form Pendaftaran Mahasiswa'
                          : 'Mengisi Google Form Pendaftaran Dosen & Staff'}
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Setelah seluruh surat ditandatangani basah/resmi dan di-scan rapi dalam bentuk PDF, pemohon mengisi Google Form yang sesuai dengan perannya.
                      </p>

                      <div className="mt-3">
                        <a
                          href={selectedRole === 'mahasiswa' ? mhsGformUrl : dosenGformUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
                        >
                          <span>
                            {selectedRole === 'mahasiswa'
                              ? 'Buka Formulir GForm Mahasiswa'
                              : 'Buka Formulir GForm Dosen & Staff'}
                          </span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Langkah 3: Notifikasi Otomatis ke Admin via WhatsApp */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-[#0b6330] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      3
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                          Notifikasi &amp; Konfirmasi ke Admin via WhatsApp
                        </h4>
                        <span className="text-[10px] bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded-full font-bold">
                          Otomatis &amp; Instan
                        </span>
                      </div>
                      <p className="text-xs text-emerald-900 mt-1 leading-relaxed">
                        <strong>Pertanyaan:</strong> <em>&ldquo;Apabila sudah mendaftar melalui Google Form apa bisa memberi notifikasi kepada admin melalui WA?&rdquo;</em>
                        <br />
                        <strong>Jawaban:</strong> <strong>BISA!</strong> Sistem Google Form terintegrasi langsung dengan Webhook WhatsApp Gateway Rumah Amal USK. Setelah mengisi Google Form, Anda juga dapat menekan tombol konfirmasi langsung di bawah ini untuk mengirim notifikasi instan ke WhatsApp Admin Rumah Amal:
                      </p>

                      <div className="mt-3">
                        <a
                          href={selectedRole === 'mahasiswa' ? waConfirmMhs : waConfirmDosen}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center px-4 py-2 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-[0.98]"
                        >
                          <span>Konfirmasi Pendaftaran ke Admin via WhatsApp</span>
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Langkah 4: Verifikasi & Penyaluran */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-[#0b6330] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      4
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                        Verifikasi Berkas &amp; Penyaluran Pinjaman
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        Tim Rumah Amal USK memverifikasi berkas dan keabsahan permohonan. Jika disetujui, dana langsung ditransfer ke rekening bank peminjam tanpa potongan dan tanpa bunga.
                      </p>
                    </div>
                  </div>

                  {/* Langkah 5: Setoran & Auto-Purge 30 Hari */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-gray-50 border border-gray-200/80 flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-full bg-[#0b6330] text-white flex items-center justify-center font-black text-xs shrink-0 mt-0.5">
                      5
                    </div>
                    <div className="flex-1">
                      <h4 className="text-xs sm:text-sm font-bold text-gray-900">
                        Pengembalian Setoran, Pengingat Awal Bulan &amp; Pembersihan Bukti Lunas (30 Hari)
                      </h4>
                      <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                        • Peminjam menyetorkan angsuran/pelunasan pinjaman dan mengunggah bukti transfer melalui Portal Setoran PINTAS.
                        <br />
                        • Sistem akan otomatis mengirimkan notifikasi pengingat via WhatsApp setiap awal bulan bagi peminjam yang belum lunas.
                        <br />
                        • Setelah berstatus <strong>LUNAS</strong>, bukti fisik pembayaran akan <strong>dihapus otomatis dalam estimasi 30 hari</strong> demi efisiensi server. Peminjam dan Admin dapat mencetak dan mengunduh <strong>Export Rekap Pinjaman (PDF) per user</strong> untuk arsip permanen.
                      </p>

                      <div className="mt-3">
                        <Link
                          href="/program/pinjaman-tanpa-syarat-pintas/setoran"
                          className="inline-flex items-center justify-center px-4 py-2 bg-gray-900 hover:bg-black text-white text-xs font-bold rounded-xl transition-all shadow-xs"
                        >
                          <span>Buka Portal Setoran Peminjam</span>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Informasi PINTAS */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs sm:text-sm font-bold text-gray-800 mb-2">
                  Pusat Informasi &amp; Layanan PINTAS
                </p>
                <a
                  href={infoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3.5 bg-[#0b6330] hover:bg-[#084e26] text-white font-bold text-xs sm:text-sm rounded-full transition-colors shadow-sm active:scale-[0.99]"
                >
                  Hubungi Layanan Informasi PINTAS (WhatsApp)
                </a>
              </div>
            </div>

            {/* ===== FOOTER SESUAI FOTO ===== */}
            <footer className="border-t border-gray-200/90 mt-14 pt-6 pb-12 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
              <div className="font-extrabold text-[#0b6330] text-sm tracking-wider">
                PINTAS
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-gray-600">
                <span className="hover:text-gray-900 cursor-pointer transition-colors">
                  Kebijakan Privasi
                </span>
                <span className="hover:text-gray-900 cursor-pointer transition-colors">
                  Syarat &amp; Ketentuan
                </span>
                <span className="hover:text-gray-900 cursor-pointer transition-colors">
                  Kontak Kami
                </span>
                <span className="hover:text-gray-900 cursor-pointer transition-colors">
                  Bantuan
                </span>
              </nav>
              <div className="text-[11px] sm:text-xs text-gray-400">
                &copy; 2024 Rumah Amal PINTAS. All rights reserved.
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
