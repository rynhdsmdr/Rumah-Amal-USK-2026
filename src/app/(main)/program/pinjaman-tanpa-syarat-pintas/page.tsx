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
  linkInformasi: string | null;
}

const DEFAULT_DEFINISI =
  'Program bantuan pinjaman tanpa syarat (PINTAS) adalah program bantuan pemberian dana dalam bentuk pinjaman dana tanpa imbalan kepada penerima sesuai dengan kriteria dengan jangka waktu pengembalian yang disepakati bersama.';

const DEFAULT_SYARAT_LINES = [
  'Surat Permohonan',
  'Surat Rekomendasi dari Dosen/Staf USK',
  'Mahasiswa Aktif/Dosen/Staf USK',
  'Surat Pernyataan tidak merokok dan tidak pacaran',
  'Kartu Identitas (KTP/KTM)',
  'Pas photo berwarna terbaru',
];

const DEFAULT_ALUR = 'Mengunduh surat permohonan dan rekomendasi melalui link';
const LINK_DOWNLOAD_DEFAULT = 'https://bit.ly/berkaspintasRA';
const LINK_INFORMASI_DEFAULT =
  'https://api.whatsapp.com/send/?phone=628116888123&text&type=phone_number&app_absent=0';

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(value);
}

export default function PintasPage() {
  const [data, setData] = useState<PintasData>({
    kuotaTersedia: 25000000,
    infaqMasuk: 42500000,
    tersalurkan: 9500000,
    definisi: DEFAULT_DEFINISI,
    syaratAdmin: DEFAULT_SYARAT_LINES.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    alurPendaftaran: DEFAULT_ALUR,
    linkDownload: LINK_DOWNLOAD_DEFAULT,
    linkInformasi: LINK_INFORMASI_DEFAULT,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/pintas');
        if (res.ok) {
          const json = await res.json();
          setData({
            kuotaTersedia: json.kuotaTersedia ?? 25000000,
            infaqMasuk: json.infaqMasuk ?? 42500000,
            tersalurkan: json.tersalurkan ?? 9500000,
            definisi: json.definisi || DEFAULT_DEFINISI,
            syaratAdmin:
              json.syaratAdmin ||
              DEFAULT_SYARAT_LINES.map((s, i) => `${i + 1}. ${s}`).join('\n'),
            alurPendaftaran: json.alurPendaftaran || DEFAULT_ALUR,
            linkDownload: json.linkDownload || LINK_DOWNLOAD_DEFAULT,
            linkInformasi: json.linkInformasi || LINK_INFORMASI_DEFAULT,
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
    totalDana > 0 ? Math.min(100, Math.max(0, (data.tersalurkan / totalDana) * 100)) : 27.5;

  const syaratLines = (data.syaratAdmin || '')
    .split('\n')
    .map((line) => line.replace(/^\d+[.]\s*/, '').trim())
    .filter(Boolean);

  const displaySyarat = syaratLines.length > 0 ? syaratLines : DEFAULT_SYARAT_LINES;

  const downloadUrl = data.linkDownload || LINK_DOWNLOAD_DEFAULT;
  const infoUrl = data.linkInformasi || LINK_INFORMASI_DEFAULT;

  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans text-gray-800">
      <main className="max-w-[860px] mx-auto px-4 sm:px-6 py-8 sm:py-10">

        {/* Back link */}
        <div className="mb-6">
          <Link
            href="/program"
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#0b6330] hover:underline"
          >
            ← Kembali ke Semua Program
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
                  <span className="text-xs sm:text-[13px] font-medium text-gray-500">Kuota Tersedia</span>
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
                  <span className="text-xs sm:text-[13px] font-medium text-gray-500">Infaq Masuk</span>
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
                  <span className="text-xs sm:text-[13px] font-medium text-gray-500">Tersalurkan</span>
                  <svg
                    className="w-5 h-5 text-gray-400 shrink-0"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    viewBox="0 0 24 24"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 12.5l2.5 2.5 5-5" />
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

            {/* ===== PROGRAM DETAILS & ACTION CARD ===== */}
            <div className="bg-white rounded-2xl border border-gray-200/80 p-6 sm:p-9 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
              {/* Definisi */}
              <div className="mb-5">
                <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 mb-2">Definisi</h3>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {data.definisi || DEFAULT_DEFINISI}
                </p>
              </div>

              {/* Syarat Administrasi */}
              <div className="mb-5">
                <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 mb-2">Syarat Administrasi</h3>
                <ol className="list-decimal list-inside text-xs sm:text-sm text-gray-700 space-y-1 leading-normal pl-0.5">
                  {displaySyarat.map((line, idx) => (
                    <li key={idx}>
                      <span className="pl-1">{line}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Alur Pendaftaran */}
              <div className="mb-5">
                <h3 className="text-sm sm:text-[15px] font-bold text-gray-900 mb-2">Alur Pendaftaran</h3>
                <p className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                  {data.alurPendaftaran || DEFAULT_ALUR}
                </p>
              </div>

              {/* Download Berkas Button */}
              <div className="mb-5">
                <a
                  href={downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 sm:py-3.5 bg-[#0b6330] hover:bg-[#084e26] text-white font-bold text-xs sm:text-sm rounded-full transition-colors shadow-sm active:scale-[0.99]"
                >
                  Download Berkas
                </a>
              </div>

              {/* Informasi PINTAS */}
              <div>
                <p className="text-xs sm:text-sm text-gray-700 mb-2">Informasi PINTAS</p>
                <a
                  href={infoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-3 sm:py-3.5 bg-[#0b6330] hover:bg-[#084e26] text-white font-bold text-xs sm:text-sm rounded-full transition-colors shadow-sm active:scale-[0.99]"
                >
                  Informasi
                </a>
              </div>
            </div>

            {/* ===== FOOTER SESUAI FOTO ===== */}
            <footer className="border-t border-gray-200/90 mt-14 pt-6 pb-12 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-500">
              <div className="font-extrabold text-[#0b6330] text-sm tracking-wider">
                PINTAS
              </div>
              <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs font-medium text-gray-600">
                <span className="hover:text-gray-900 cursor-pointer transition-colors">Kebijakan Privasi</span>
                <span className="hover:text-gray-900 cursor-pointer transition-colors">Syarat & Ketentuan</span>
                <span className="hover:text-gray-900 cursor-pointer transition-colors">Kontak Kami</span>
                <span className="hover:text-gray-900 cursor-pointer transition-colors">Bantuan</span>
              </nav>
              <div className="text-[11px] sm:text-xs text-gray-400">
                © 2024 Rumah Amal PINTAS. All rights reserved.
              </div>
            </footer>
          </>
        )}
      </main>
    </div>
  );
}
