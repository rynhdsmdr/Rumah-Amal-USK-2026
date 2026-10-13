'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserSessionData } from '@/lib/user-auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faUser,
  faGraduationCap,
  faBriefcase,
  faUsers,
  faCheckCircle,
  faSignOutAlt,
  faEdit,
  faArrowRight,
  faFolderOpen,
  faClock,
  faTimesCircle,
  faSpinner,
  faPhone,
  faIdCard,
  faEnvelope,
  faExternalLinkAlt,
} from '@fortawesome/free-solid-svg-icons';

interface SubmissionItem {
  id: string;
  token: string;
  batch: string | null;
  status: string;
  submittedAt: string | Date;
  program: {
    id: string;
    nama: string;
    slug: string;
    status: string;
    kategori?: string | null;
  };
}

interface Props {
  user: UserSessionData;
  profile: any;
  submissions: SubmissionItem[];
}

export default function AkunDashboardClient({ user, profile, submissions }: Props) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (!confirm('Apakah Anda yakin ingin keluar dari akun?')) return;
    setLoggingOut(true);
    try {
      await fetch('/api/auth/me', { method: 'POST' });
      router.push('/masuk');
      router.refresh();
    } catch {
      setLoggingOut(false);
    }
  };

  const getKelompokLabel = (kelompok: string | null) => {
    switch (kelompok) {
      case 'MAHASISWA_USK':
        return { label: 'Mahasiswa USK', icon: faGraduationCap, color: 'emerald' };
      case 'DOSEN_STAFF_USK':
        return { label: 'Dosen / Staff USK', icon: faBriefcase, color: 'blue' };
      case 'MASYARAKAT_UMUM':
        return { label: 'Masyarakat Umum', icon: faUsers, color: 'purple' };
      default:
        return { label: 'Pendaftar', icon: faUser, color: 'gray' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'lolos':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600" />
            <span>Lolos Seleksi</span>
          </span>
        );
      case 'tidak_lolos':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300">
            <FontAwesomeIcon icon={faTimesCircle} className="text-gray-500" />
            <span>Tidak Lolos Seleksi</span>
          </span>
        );
      case 'sedang_diproses':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
            <FontAwesomeIcon icon={faClock} className="text-blue-600 animate-pulse" />
            <span>Sedang Diverifikasi</span>
          </span>
        );
      case 'belum_diseleksi':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <FontAwesomeIcon icon={faClock} className="text-amber-600" />
            <span>Tahap Seleksi</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <FontAwesomeIcon icon={faClock} className="text-amber-600" />
            <span>Menunggu Diproses</span>
          </span>
        );
    }
  };

  const kelompokInfo = getKelompokLabel(user.kelompok);

  return (
    <div className="min-h-screen bg-gray-50/60 py-8 sm:py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* PROFILE HEADER CARD */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 sm:p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#005621] via-emerald-600 to-[#f5b016]" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#005621] to-emerald-700 text-white flex items-center justify-center text-2xl sm:text-3xl font-black shadow-md shrink-0">
                {profile?.namaLengkap ? profile.namaLengkap.slice(0, 1).toUpperCase() : user.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
                    {profile?.namaLengkap || user.name || 'Pendaftar Rumah Amal'}
                  </h1>
                  <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-2xs font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005621] border border-emerald-200">
                    <FontAwesomeIcon icon={kelompokInfo.icon} />
                    <span>{kelompokInfo.label}</span>
                  </span>
                  {submissions && submissions.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-2xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                      <span>🔒 Terkunci Permanen</span>
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-medium pt-0.5">
                  <span className="inline-flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faEnvelope} className="text-gray-400" />
                    <span>{user.email}</span>
                  </span>
                  {profile?.noWa && (
                    <span className="inline-flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faPhone} className="text-gray-400" />
                      <span>{profile.noWa}</span>
                    </span>
                  )}
                  {profile?.nik && (
                    <span className="inline-flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faIdCard} className="text-gray-400" />
                      <span>NIK: {profile.nik}</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2.5 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end border-t sm:border-t-0 pt-4 sm:pt-0">
              <Link
                href="/akun/onboarding"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-bold text-xs shadow-2xs transition-all cursor-pointer"
              >
                <FontAwesomeIcon icon={faEdit} className="text-emerald-700" />
                <span>{submissions && submissions.length > 0 ? 'Perbarui Kontak (WA)' : 'Ubah Biodata'}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-bold text-xs shadow-2xs transition-all cursor-pointer disabled:opacity-50"
              >
                {loggingOut ? (
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                ) : (
                  <FontAwesomeIcon icon={faSignOutAlt} />
                )}
                <span>Keluar</span>
              </button>
            </div>
          </div>
        </div>

        {/* HERO CALL TO ACTION: KATALOG PENDAFTARAN PROGRAM */}
        <div className="bg-gradient-to-br from-[#005621] to-[#043d1a] rounded-3xl p-6 sm:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-8 translate-y-8">
            <FontAwesomeIcon icon={faFolderOpen} className="text-[200px]" />
          </div>

          <div className="relative z-10 max-w-2xl space-y-3">
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              Katalog Pendaftaran Bantuan &amp; Beasiswa
            </h2>
            <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed font-normal">
              Seluruh pendaftaran program bantuan Rumah Amal USK hanya dapat diakses melalui portal akun ini. Isian biodata dan berkas identitas Anda akan terlampir otomatis.
            </p>
            <div className="pt-2">
              <Link
                href="/pendaftaran"
                className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-2xl bg-[#f5b016] hover:bg-[#ffc800] text-[#063A1E] font-black text-xs sm:text-sm shadow-md hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 cursor-pointer"
              >
                <span>Buka Katalog Program Sekarang</span>
                <FontAwesomeIcon icon={faArrowRight} />
              </Link>
            </div>
          </div>
        </div>

        {/* RIWAYAT PENDAFTARAN SAYA */}
        <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-900 tracking-tight">
                Riwayat Pendaftaran Program Saya
              </h2>
              <p className="text-xs text-gray-500 font-normal mt-0.5">
                Daftar program bantuan yang pernah Anda daftarkan beserta status seleksinya.
              </p>
            </div>
            <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-bold self-start sm:self-auto">
              Total: {submissions.length} Pendaftaran
            </span>
          </div>

          {submissions.length === 0 ? (
            <div className="text-center py-12 px-4 space-y-4 rounded-2xl bg-gray-50/60 border border-dashed border-gray-200">
              <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#005621] flex items-center justify-center mx-auto text-xl border border-emerald-200/60 shadow-2xs">
                <FontAwesomeIcon icon={faFolderOpen} />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-gray-900">Belum Ada Program yang Didaftarkan</h3>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  Anda belum pernah mengajukan pendaftaran bantuan. Buka katalog untuk melihat program yang sedang dibuka untuk kelompok Anda.
                </p>
              </div>
              <Link
                href="/pendaftaran"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#005621] text-white font-bold text-xs hover:bg-[#004218] transition-all shadow-2xs cursor-pointer"
              >
                <span>Lihat Program Terbuka</span>
                <FontAwesomeIcon icon={faArrowRight} className="text-3xs" />
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {submissions.map((sub) => (
                <div
                  key={sub.id}
                  className="py-4.5 sm:py-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50/50 rounded-xl px-3 transition-colors"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">
                        {sub.program.nama}
                      </h3>
                      {sub.batch && (
                        <span className="px-2 py-0.5 rounded text-2xs font-extrabold bg-emerald-50 text-[#005621] border border-emerald-200">
                          Batch: {sub.batch}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 font-normal">
                      <span>
                        Didaftar pada:{' '}
                        <strong className="text-gray-700 font-semibold">
                          {new Date(sub.submittedAt).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </strong>
                      </span>
                      <span>
                        Token:<code className="ml-1 px-1.5 py-0.5 rounded bg-gray-100 text-gray-700 font-mono text-2xs font-bold">{sub.token.slice(0, 10)}…</code>
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
                    {getStatusBadge(sub.status)}
                    <Link
                      href={`/perbaiki/${sub.token}`}
                      className="px-3.5 py-2 rounded-xl bg-gray-50 hover:bg-[#005621] text-gray-700 hover:text-white border border-gray-200 font-bold text-xs transition-all shadow-2xs inline-flex items-center gap-1.5 group cursor-pointer"
                      title="Lihat status formulir atau perbaiki berkas"
                    >
                      <span>Buka Formulir</span>
                      <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs transition-transform group-hover:scale-110" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
