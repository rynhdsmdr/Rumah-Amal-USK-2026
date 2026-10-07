'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { UserSessionData } from '@/lib/user-auth';
import {
  faGraduationCap,
  faCalendarAlt,
  faFileAlt,
  faArrowRight,
  faSearch,
  faInfoCircle,
  faQuestionCircle,
  faUserCircle,
  faLock,
  faBriefcase,
  faUsers,
  faArrowLeft,
} from '@fortawesome/free-solid-svg-icons';

interface ProgramItem {
  id: string;
  nama: string;
  slug: string;
  kategori?: string | null;
  targetKelompok?: string | null;
  deskripsi: string | null;
  gambarUrl: string | null;
  status: string;
  tanggalBuka: Date | string | null;
  tanggalTutup: Date | string | null;
  linkDriveTemplate: string | null;
  _count: {
    documentFields: number;
    biodataFields: number;
  };
}

export default function PendaftaranKatalogClient({
  initialPrograms,
  userSession,
}: {
  initialPrograms: ProgramItem[];
  userSession?: UserSessionData | null;
}) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [checkToken, setCheckToken] = useState('');
  const [tabFilter, setTabFilter] = useState<'khusus' | 'semua'>(
    userSession?.kelompok ? 'khusus' : 'semua'
  );

  const kelompokLabel =
    userSession?.kelompok === 'MAHASISWA_USK'
      ? 'Mahasiswa USK'
      : userSession?.kelompok === 'DOSEN_STAFF_USK'
      ? 'Dosen / Staff USK'
      : userSession?.kelompok === 'MASYARAKAT_UMUM'
      ? 'Masyarakat Umum'
      : '';

  const filteredPrograms = initialPrograms.filter((p) => {
    const matchSearch =
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      (p.deskripsi && p.deskripsi.toLowerCase().includes(search.toLowerCase()));

    if (!matchSearch) return false;

    // Filter tab jika user punya kelompok dan memilih tab khusus
    if (tabFilter === 'khusus' && userSession?.kelompok) {
      if (p.targetKelompok && p.targetKelompok !== 'SEMUA' && p.targetKelompok !== userSession.kelompok) {
        return false;
      }
    }

    return true;
  });

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Tidak ditentukan';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="min-h-screen bg-gray-50/60 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-[1280px] mx-auto space-y-8">

        {/* TOP BAR / BACK TO ACCOUNT */}
        <div className="flex items-center justify-between pb-0.5">
          <Link
            href="/akun"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#005621] transition-colors group"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
            <span>Kembali ke Halaman Akun Saya</span>
          </Link>
        </div>

        {/* HERO SECTION */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#003815] to-[#005621] text-white p-8 sm:p-12 shadow-xl">
          <div className="relative z-10 max-w-3xl space-y-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              Pendaftaran Program Bantuan & Beasiswa
            </h1>
            <p className="text-gray-200 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
              Rumah Amal Masjid Jamik USK menyalurkan amanah zakat, infaq, dan shadaqah untuk membantu mahasiswa dan masyarakat berprestasi yang membutuhkan melalui proses verifikasi yang transparan dan akuntabel.
            </p>
          </div>

          {/* Background Decorative Pattern */}
          <div className="absolute right-0 bottom-0 translate-x-12 translate-y-12 opacity-10 pointer-events-none">
            <FontAwesomeIcon icon={faGraduationCap} className="w-96 h-96 text-white" />
          </div>
        </div>

        {/* ALUR SINGKAT PENDAFTARAN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-[#0b6330] flex items-center justify-center font-black text-base shrink-0">
              1
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Pilih Program & Siapkan Berkas</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Pilih program yang sesuai kriteria Anda dan unduh template dokumen resmi yang disediakan.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-black text-base shrink-0">
              2
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Isi Formulir & Unggah Berkas</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Lengkapi data diri serta unggah berkas yang diminta secara rapi dan jelas.
              </p>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center font-black text-base shrink-0">
              3
            </div>
            <div>
              <h3 className="font-bold text-gray-900 text-sm mb-1">Konfirmasi Email &amp; Akses Formulir</h3>
              <p className="text-xs text-gray-500 leading-relaxed">
                Tautan bukti pendaftaran dan akses perbaikan berkas otomatis dikirimkan ke alamat email aktif Anda.
              </p>
            </div>
          </div>
        </div>

        {/* CEK & PERBAIKI PENDAFTARAN */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#005621]" />
              <span>Sudah Pernah Mendaftar?</span>
            </h3>
            <p className="text-xs text-gray-500 font-normal">
              Periksa email Anda untuk membuka tautan formulir secara langsung, atau masukkan token pendaftaran jika Anda menyimpannya.
            </p>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (checkToken.trim()) {
                router.push(`/perbaiki/${checkToken.trim()}`);
              }
            }}
            className="flex items-center gap-2 w-full md:w-auto"
          >
            <input
              type="text"
              placeholder="Masukkan Token Pendaftaran..."
              value={checkToken}
              onChange={(e) => setCheckToken(e.target.value)}
              className="flex-1 md:w-72 px-3.5 py-2.5 bg-gray-50/70 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#005621]/15 focus:border-[#005621] transition-all"
            />
            <button
              type="submit"
              disabled={!checkToken.trim()}
              className="px-5 py-2.5 bg-[#005621] hover:bg-[#004218] text-white font-bold text-xs rounded-xl shadow-2xs transition-all disabled:opacity-40 cursor-pointer shrink-0"
            >
              Cek / Perbaiki
            </button>
          </form>
        </div>

        {/* BANNER STATUS AKUN PENDAFTAR */}
        {userSession ? (
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-emerald-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#005621] text-white flex items-center justify-center font-black text-lg shrink-0">
                <FontAwesomeIcon
                  icon={
                    userSession.kelompok === 'MAHASISWA_USK'
                      ? faGraduationCap
                      : userSession.kelompok === 'DOSEN_STAFF_USK'
                      ? faBriefcase
                      : faUsers
                  }
                />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-black text-gray-900 text-sm sm:text-base">
                    {userSession.name || 'Pendaftar Rumah Amal'}
                  </h3>
                  {kelompokLabel && (
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#005621] text-[10px] font-black border border-emerald-200">
                      {kelompokLabel}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-400">{userSession.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!userSession.isProfileCompleted ? (
                <Link
                  href="/akun/onboarding"
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-500 text-gray-900 text-xs font-black rounded-xl shadow-xs transition-colors"
                >
                  ⚡ Lengkapi Single Identity
                </Link>
              ) : (
                <Link
                  href="/akun/onboarding"
                  className="px-3.5 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Profil Single Identity
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-emerald-50 via-green-50 to-amber-50/60 rounded-3xl p-6 border border-emerald-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <FontAwesomeIcon icon={faUserCircle} className="text-[#005621]" />
                <span>Masuk dengan Akun Pendaftar Rumah Amal</span>
              </h3>
              <p className="text-xs text-gray-600 max-w-xl">
                Gunakan email kampus USK (@mhs.usk.ac.id / @usk.ac.id) atau akun Google pribadi untuk kemudahan berkas Single Identity otomatis &amp; cek status seleksi.
              </p>
            </div>
            <Link
              href="/masuk"
              className="px-6 py-2.5 bg-[#005621] hover:bg-[#004218] text-white font-extrabold text-xs rounded-xl shadow-sm transition-all whitespace-nowrap text-center shrink-0"
            >
              Masuk / Daftar Akun →
            </Link>
          </div>
        )}

        {/* SEARCH & TITLE BAR WITH SWITCH FILTER */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-2">
          <div>
            <h2 className="text-2xl font-black text-gray-900">Program Terbuka Saat Ini</h2>
            <p className="text-xs text-gray-500 mt-1">
              Menampilkan {filteredPrograms.length} program bantuan &amp; beasiswa yang siap menerima pendaftaran.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Tab Switcher (Konsep Switch Tab) */}
            {userSession?.kelompok && (
              <div className="inline-flex p-1 bg-gray-200/80 rounded-xl text-xs font-bold shrink-0">
                <button
                  type="button"
                  onClick={() => setTabFilter('khusus')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    tabFilter === 'khusus'
                      ? 'bg-white text-[#005621] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Khusus {kelompokLabel}
                </button>
                <button
                  type="button"
                  onClick={() => setTabFilter('semua')}
                  className={`px-3.5 py-1.5 rounded-lg transition-all cursor-pointer ${
                    tabFilter === 'semua'
                      ? 'bg-white text-[#005621] shadow-xs'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Semua Program
                </button>
              </div>
            )}

            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="Cari program bantuan..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#005621] focus:ring-1 focus:ring-[#005621] shadow-2xs"
              />
              <FontAwesomeIcon
                icon={faSearch}
                className="absolute left-3.5 top-2.5 text-gray-400 w-3.5 h-3.5"
              />
            </div>
          </div>
        </div>

        {/* LIST PROGRAM CARDS */}
        {filteredPrograms.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-100 p-12 text-center max-w-md mx-auto shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto text-2xl">
              <FontAwesomeIcon icon={faInfoCircle} />
            </div>
            <h3 className="text-base font-bold text-gray-900">Belum Ada Program Terbuka</h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Saat ini belum ada pendaftaran program bantuan atau beasiswa yang sedang dibuka untuk kriteria ini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {filteredPrograms.map((program) => {
              // Pengecekan kecocokan kelompok akun
              const isEligible =
                !userSession?.kelompok ||
                !program.targetKelompok ||
                program.targetKelompok === 'SEMUA' ||
                program.targetKelompok === userSession.kelompok;

              return (
                <div
                  key={program.id}
                  className={`group bg-white rounded-3xl border shadow-sm transition-all duration-300 flex flex-col overflow-hidden ${
                    isEligible
                      ? 'border-gray-100/90 hover:shadow-xl hover:-translate-y-1'
                      : 'border-gray-200 bg-gray-50/50 opacity-90'
                  }`}
                >
                  {/* Image / Header Graphic */}
                  <div className="relative aspect-[16/9] w-full bg-gray-100 overflow-hidden">
                    {program.gambarUrl ? (
                      <Image
                        src={program.gambarUrl}
                        alt={program.nama}
                        fill
                        className={`object-cover transition-transform duration-500 ${
                          isEligible ? 'group-hover:scale-105' : 'grayscale'
                        }`}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-[#063A1E]/10 to-[#0b6330]/20 text-[#0b6330]">
                        <FontAwesomeIcon icon={faGraduationCap} className="w-12 h-12 opacity-80" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-2.5">
                      <h3
                        className={`text-lg font-black transition-colors line-clamp-2 ${
                          isEligible ? 'text-gray-900 group-hover:text-[#0b6330]' : 'text-gray-700'
                        }`}
                      >
                        {program.nama}
                      </h3>

                      {program.deskripsi && (
                        <p className="text-xs text-gray-600 line-clamp-3 leading-relaxed font-normal">
                          {program.deskripsi}
                        </p>
                      )}
                    </div>

                    <div className="space-y-3 pt-3 border-t border-gray-100">
                      {/* Jadwal Buka - Tutup */}
                      <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <FontAwesomeIcon icon={faCalendarAlt} className="w-3.5 h-3.5 text-[#0b6330]" />
                          Batas Waktu:
                        </span>
                        <span className="font-bold text-gray-800">
                          {formatDate(program.tanggalTutup)}
                        </span>
                      </div>

                      {/* Dokumen Count */}
                      <div className="flex items-center justify-between text-xs text-gray-600 font-medium">
                        <span className="flex items-center gap-1.5 text-gray-500">
                          <FontAwesomeIcon icon={faFileAlt} className="w-3.5 h-3.5 text-amber-600" />
                          Syarat Berkas:
                        </span>
                        <span className="font-bold text-gray-800">
                          {program._count.documentFields} Dokumen
                        </span>
                      </div>

                      {/* Action Button: Jika tidak eligible, tombol berwarna gelap dan tidak bisa ditekan */}
                      {isEligible ? (
                        <Link
                          href={`/pendaftaran/${program.slug}`}
                          className="mt-2 w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-[#0b6330] hover:bg-[#063A1E] text-white font-bold text-xs rounded-xl shadow-md transition-all duration-200 group-hover:shadow-green-900/20 cursor-pointer"
                        >
                          <span>Buka Formulir Pendaftaran</span>
                          <FontAwesomeIcon
                            icon={faArrowRight}
                            className="w-3 h-3 group-hover:translate-x-1 transition-transform"
                          />
                        </Link>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="mt-2 w-full inline-flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 text-gray-400 font-bold text-xs rounded-xl shadow-none cursor-not-allowed opacity-85 select-none"
                          title="Program ini tidak diperuntukkan bagi kelompok akun Anda"
                        >
                          <FontAwesomeIcon icon={faLock} className="w-3 h-3 text-gray-400" />
                          <span>Tidak Tersedia untuk Akun Anda</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* FAQ KILAT */}
        <div className="bg-white rounded-3xl border border-gray-100 p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 text-[#0b6330] flex items-center justify-center text-lg">
              <FontAwesomeIcon icon={faQuestionCircle} />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">Pertanyaan Umum Seputar Pendaftaran</h3>
              <p className="text-xs text-gray-500">Hal-hal yang sering ditanyakan oleh calon pendaftar.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-600">
            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1.5">
              <h4 className="font-bold text-gray-900 text-sm">Apakah saya perlu membuat akun untuk mendaftar?</h4>
              <p className="leading-relaxed">
                Tidak. Sistem pendaftaran Rumah Amal USK berbasis token. Anda cukup mengisi formulir dan sistem akan menerbitkan token verifikasi unik untuk Anda.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1.5">
              <h4 className="font-bold text-gray-900 text-sm">Format dokumen apa saja yang didukung?</h4>
              <p className="leading-relaxed">
                File scan/dokumen dapat diunggah dalam format PDF, JPG, atau PNG dengan batas ukuran maksimal 10MB per berkas.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1.5">
              <h4 className="font-bold text-gray-900 text-sm">Di mana saya bisa mengunduh format surat rekomendasi?</h4>
              <p className="leading-relaxed">
                Di dalam halaman formulir pendaftaran tiap program, terdapat tombol langsung menuju folder Google Drive resmi berisi seluruh template dokumen yang dibutuhkan.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-gray-50/80 border border-gray-100 space-y-1.5">
              <h4 className="font-bold text-gray-900 text-sm">Bagaimana jika salah satu berkas saya ditolak atau buram?</h4>
              <p className="leading-relaxed">
                Sistem akan memverifikasi berkas Anda secara otomatis. Jika ditemukan ketidaksesuaian, Anda akan menerima email pemberitahuan dengan link perbaikan tanpa perlu mengisi ulang seluruh form.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
