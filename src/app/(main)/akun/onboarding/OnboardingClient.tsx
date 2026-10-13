'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { saveSingleIdentityProfile, UserSessionData } from '@/lib/user-auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faGraduationCap,
  faBriefcase,
  faUsers,
  faCheckCircle,
  faSpinner,
  faPhone,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

const FAKULTAS_USK_OPTIONS = [
  'Fakultas Ekonomi dan Bisnis',
  'Fakultas Kedokteran Hewan',
  'Fakultas Hukum',
  'Fakultas Teknik',
  'Fakultas Pertanian',
  'Fakultas Keguruan dan Ilmu Pendidikan',
  'Fakultas Kedokteran',
  'Fakultas Matematika dan Ilmu Pengetahuan Alam',
  'Fakultas Ilmu Sosial dan Ilmu Politik',
  'Fakultas Kelautan dan Perikanan',
  'Fakultas Keperawatan',
  'Fakultas Kedokteran Gigi',
  'Sekolah Pascasarjana',
];

interface Props {
  user: UserSessionData;
  existingProfile: any;
  initialKelompok: 'MAHASISWA_USK' | 'DOSEN_STAFF_USK' | 'MASYARAKAT_UMUM';
  isLocked: boolean;
  availableOptions: Array<{ id: string; label: string }>;
  hasSubmissions?: boolean;
}

export default function OnboardingClient({
  user,
  existingProfile,
  initialKelompok,
  isLocked,
  availableOptions,
  hasSubmissions = false,
}: Props) {
  const router = useRouter();

  // Validasi domain email secara mutlak
  const emailClean = (user?.email || '').trim().toLowerCase();
  const isMhsDomain = emailClean.endsWith('@mhs.usk.ac.id');
  const isDosenDomain = emailClean.endsWith('@usk.ac.id') && !isMhsDomain;

  // Jika domain kampus, kelompok dikunci mutlak (tidak boleh beralih)
  const lockedKelompok = isMhsDomain
    ? 'MAHASISWA_USK'
    : isDosenDomain
    ? 'DOSEN_STAFF_USK'
    : existingProfile?.kelompok || initialKelompok || 'MASYARAKAT_UMUM';

  const [kelompok, setKelompok] = useState<'MAHASISWA_USK' | 'DOSEN_STAFF_USK' | 'MASYARAKAT_UMUM'>(
    lockedKelompok
  );
  const handleSetKelompok = (val: 'MAHASISWA_USK' | 'DOSEN_STAFF_USK' | 'MASYARAKAT_UMUM') => {
    if (isMhsDomain || isDosenDomain) return; // Terkunci mutlak
    setKelompok(val);
    setErrorMsg('');
  };

  // Form State: Nama default dibiarkan kosong untuk pendaftar baru
  const [namaLengkap, setNamaLengkap] = useState(existingProfile?.namaLengkap || '');
  const [nik, setNik] = useState(existingProfile?.nik || '');
  const [noWa, setNoWa] = useState(existingProfile?.noWa || '');

  // Mahasiswa
  const [npm, setNpm] = useState(existingProfile?.npm || '');
  const [fakultas, setFakultas] = useState(existingProfile?.fakultas || '');
  const [prodi, setProdi] = useState(existingProfile?.prodi || '');

  // Dosen/Staff
  const [nip, setNip] = useState(existingProfile?.nip || '');
  const [unitKerja, setUnitKerja] = useState(existingProfile?.unitKerja || '');

  // Masyarakat
  const [alamat, setAlamat] = useState(existingProfile?.alamat || '');
  const [pekerjaan, setPekerjaan] = useState(existingProfile?.pekerjaan || '');

  // Berkas URLs
  const [ktpUrl, setKtpUrl] = useState(existingProfile?.ktpUrl || '');
  const [ktmUrl, setKtmUrl] = useState(existingProfile?.ktmUrl || '');
  const [kartuPegawaiUrl, setKartuPegawaiUrl] = useState(existingProfile?.kartuPegawaiUrl || '');
  const [kkUrl, setKkUrl] = useState(existingProfile?.kkUrl || '');

  // Uploading states
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleFileUpload = async (field: 'ktp' | 'ktm' | 'pegawai' | 'kk', file: File) => {
    setUploadingField(field);
    setErrorMsg('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('bucket', 'Dokumen');
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Gagal mengunggah file.');
      }
      const data = await res.json();
      if (field === 'ktp') setKtpUrl(data.url);
      if (field === 'ktm') setKtmUrl(data.url);
      if (field === 'pegawai') setKartuPegawaiUrl(data.url);
      if (field === 'kk') setKkUrl(data.url);
    } catch (err: any) {
      setErrorMsg(`Upload gagal: ${err.message}`);
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!namaLengkap.trim() || !nik.trim() || !noWa.trim()) {
      setErrorMsg('Nama Lengkap, NIK, dan No. WhatsApp wajib diisi.');
      return;
    }

    if (kelompok === 'MAHASISWA_USK' && (!npm.trim() || !fakultas.trim())) {
      setErrorMsg('Mahasiswa USK wajib mengisi NPM dan Fakultas.');
      return;
    }

    if (kelompok === 'DOSEN_STAFF_USK' && (!nip.trim() || !unitKerja.trim())) {
      setErrorMsg('Dosen/Staff USK wajib mengisi NIP/NIDN dan Unit Kerja.');
      return;
    }

    if (kelompok === 'MASYARAKAT_UMUM' && !alamat.trim()) {
      setErrorMsg('Masyarakat umum wajib mengisi alamat domisili.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await saveSingleIdentityProfile({
        kelompok,
        namaLengkap,
        nik,
        noWa,
        npm: kelompok === 'MAHASISWA_USK' ? npm : undefined,
        fakultas: kelompok === 'MAHASISWA_USK' ? fakultas : undefined,
        prodi: kelompok === 'MAHASISWA_USK' ? prodi : undefined,
        nip: kelompok === 'DOSEN_STAFF_USK' ? nip : undefined,
        unitKerja: kelompok === 'DOSEN_STAFF_USK' ? unitKerja : undefined,
        alamat: kelompok === 'MASYARAKAT_UMUM' ? alamat : undefined,
        pekerjaan: kelompok === 'MASYARAKAT_UMUM' ? pekerjaan : undefined,
        ktpUrl: ktpUrl || undefined,
        ktmUrl: kelompok === 'MAHASISWA_USK' ? (ktmUrl || undefined) : undefined,
        kartuPegawaiUrl: kelompok === 'DOSEN_STAFF_USK' ? (kartuPegawaiUrl || undefined) : undefined,
        kkUrl: kkUrl || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Gagal menyimpan profil biodata.');
        return;
      }

      setSuccessMsg('Profil biodata berhasil disimpan! Mengalihkan ke halaman akun…');
      setTimeout(() => {
        router.push('/akun');
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/70 py-10 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900">
            Lengkapi Profil Biodata &amp; Berkas
          </h1>
        </div>

        {/* Tab Switcher / Locked Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-gray-900">Kelompok Pendaftar</h2>
              <p className="text-xs text-gray-400">
                Kategori profil pendaftar sesuai identitas Anda
              </p>
            </div>
            {isMhsDomain && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-[#005621] border border-emerald-200 rounded-full text-xs font-bold">
                <FontAwesomeIcon icon={faCheckCircle} className="text-2xs text-[#005621]" /> Mahasiswa USK
              </span>
            )}
            {isDosenDomain && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-800 border border-blue-200 rounded-full text-xs font-bold">
                <FontAwesomeIcon icon={faCheckCircle} className="text-2xs text-blue-600" /> Dosen / Staff USK
              </span>
            )}
          </div>

          {/* Jika Akun Mahasiswa USK (@mhs.usk.ac.id): Langsung Mahasiswa USK, tanpa opsi lain */}
          {isMhsDomain ? (
            <div className="p-4.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#005621] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-xl" />
                </div>
                <div>
                  <p className="text-sm font-black text-[#005621]">
                    Mahasiswa USK
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Terhubung melalui email resmi <b>{user.email}</b>. Profil biodata Anda otomatis diproses dalam kelompok Mahasiswa USK.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-3 py-1 bg-emerald-100 text-[#005621] border border-emerald-200 rounded-lg text-2xs font-extrabold uppercase tracking-wider shrink-0">
                Civitas Akademika
              </span>
            </div>
          ) : isDosenDomain ? (
            /* Jika Akun Dosen/Staf USK (@usk.ac.id): Langsung Dosen / Staff USK, tanpa opsi lain */
            <div className="p-4.5 rounded-2xl bg-blue-50/80 border border-blue-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-blue-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FontAwesomeIcon icon={faBriefcase} className="text-xl" />
                </div>
                <div>
                  <p className="text-sm font-black text-blue-900">
                    Dosen / Staff USK
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Terhubung melalui email resmi <b>{user.email}</b>. Profil biodata Anda otomatis diproses dalam kelompok Dosen &amp; Tenaga Kependidikan USK.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-3 py-1 bg-blue-100 text-blue-900 border border-blue-200 rounded-lg text-2xs font-extrabold uppercase tracking-wider shrink-0">
                Civitas Akademika
              </span>
            </div>
          ) : existingProfile?.kelompok ? (
            /* Jika Email Publik & Sudah Pernah Simpan Biodata: Tetap pada kelompok terdaftar */
            <div className="p-4.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-gray-800 text-white flex items-center justify-center shrink-0 shadow-xs">
                  <FontAwesomeIcon
                    icon={
                      kelompok === 'MAHASISWA_USK'
                        ? faGraduationCap
                        : kelompok === 'DOSEN_STAFF_USK'
                        ? faBriefcase
                        : faUsers
                    }
                    className="text-xl"
                  />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900">
                    {kelompok === 'MAHASISWA_USK'
                      ? 'Mahasiswa USK'
                      : kelompok === 'DOSEN_STAFF_USK'
                      ? 'Dosen / Staff USK'
                      : 'Masyarakat Umum'}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Kategori kelompok pendaftar yang tersimpan untuk akun <b>{user.email}</b>.
                  </p>
                </div>
              </div>
              <span className="hidden sm:inline-flex px-3 py-1 bg-gray-200 text-gray-800 rounded-lg text-2xs font-extrabold uppercase tracking-wider shrink-0">
                Kategori Terdaftar
              </span>
            </div>
          ) : (
            /* Email Publik Baru: Pilihan kategori kelompok */
            <div className="space-y-2">
              <p className="text-xs text-gray-500 font-medium">
                Pilih kategori profil yang sesuai dengan pendaftaran Anda:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 bg-gray-100/80 rounded-2xl">
                {[
                  { id: 'MASYARAKAT_UMUM', label: 'Masyarakat Umum', icon: faUsers },
                  { id: 'MAHASISWA_USK', label: 'Mahasiswa USK', icon: faGraduationCap },
                  { id: 'DOSEN_STAFF_USK', label: 'Dosen / Staff USK', icon: faBriefcase },
                ].map((opt) => {
                  const active = kelompok === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSetKelompok(opt.id as any)}
                      className={`py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        active
                          ? 'bg-white text-[#005621] shadow-sm ring-1 ring-black/5'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                      }`}
                    >
                      <FontAwesomeIcon
                        icon={opt.icon}
                        className={active ? 'text-[#005621]' : 'text-gray-400'}
                      />
                      <span>{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Form Biodata & Berkas (Dinamis Sesuai Tab Kelompok) */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
          {hasSubmissions && (
            <div className="p-4 sm:p-5 rounded-2xl bg-amber-50/90 border border-amber-300 text-amber-900 flex items-start gap-3">
              <span className="text-xl shrink-0 mt-0.5">🔒</span>
              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-black">
                  Biodata Pokok &amp; Berkas Terkunci Permanen
                </p>
                <p className="text-xs leading-relaxed text-amber-800">
                  Akun Anda telah memiliki riwayat pendaftaran program bantuan di Rumah Amal USK. Untuk menjaga keaslian data dan mencegah penyalahgunaan akun, data pokok (Nama Lengkap, NIK, NPM/NIP, Kelompok) dan berkas resmi telah dibekukan. Anda hanya dapat memperbarui nomor kontak aktif (WhatsApp) atau alamat domisili. Untuk permohonan koreksi data pokok, silakan hubungi admin Rumah Amal USK.
                </p>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-start gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2">
              <FontAwesomeIcon icon={faCheckCircle} className="text-base text-emerald-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* SECTION 1: BIODATA PERMANEN */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-gray-900 border-b border-gray-100 pb-2">
              1. Biodata Permanen ({kelompok === 'MAHASISWA_USK' ? 'Mahasiswa USK' : kelompok === 'DOSEN_STAFF_USK' ? 'Dosen / Staff USK' : 'Masyarakat Umum'})
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Lengkap <span className="text-red-500">*</span>
                  {hasSubmissions && <span className="ml-2 text-2xs text-amber-700 font-bold">🔒 Terkunci</span>}
                </label>
                <input
                  type="text"
                  required
                  readOnly={hasSubmissions}
                  disabled={hasSubmissions}
                  placeholder="Sesuai KTP / Berkas Resmi"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] ${
                    hasSubmissions ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  NIK (Nomor Induk Kependudukan) <span className="text-red-500">*</span>
                  {hasSubmissions && <span className="ml-2 text-2xs text-amber-700 font-bold">🔒 Terkunci</span>}
                </label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  readOnly={hasSubmissions}
                  disabled={hasSubmissions}
                  placeholder="16 digit NIK KTP"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] ${
                    hasSubmissions ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none' : ''
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nomor WhatsApp Aktif <span className="text-red-500">*</span>
                  {hasSubmissions && <span className="ml-2 text-2xs text-emerald-700 font-bold">✓ Dapat Diubah</span>}
                </label>
                <div className="relative">
                  <FontAwesomeIcon icon={faPhone} className="absolute left-3.5 top-3 text-gray-400 text-xs" />
                  <input
                    type="tel"
                    required
                    placeholder="08xxxxxxxxxx"
                    value={noWa}
                    onChange={(e) => setNoWa(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                  />
                </div>
              </div>

              {/* KHUSUS MAHASISWA USK */}
              {kelompok === 'MAHASISWA_USK' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      NPM (Nomor Pokok Mahasiswa) <span className="text-red-500">*</span>
                      {hasSubmissions && <span className="ml-2 text-2xs text-amber-700 font-bold">🔒 Terkunci</span>}
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={hasSubmissions}
                      disabled={hasSubmissions}
                      placeholder="Contoh: 2108107010001"
                      value={npm}
                      onChange={(e) => setNpm(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] ${
                        hasSubmissions ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none' : ''
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Fakultas <span className="text-red-500">*</span>
                      {hasSubmissions && <span className="ml-2 text-2xs text-amber-700 font-bold">🔒 Terkunci</span>}
                    </label>
                    <select
                      required
                      disabled={hasSubmissions}
                      value={fakultas}
                      onChange={(e) => setFakultas(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] bg-white ${
                        hasSubmissions ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none' : 'cursor-pointer'
                      }`}
                    >
                      <option value="">-- Pilih Fakultas di USK --</option>
                      {FAKULTAS_USK_OPTIONS.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Program Studi / Jurusan
                      {hasSubmissions && <span className="ml-2 text-2xs text-amber-700 font-bold">🔒 Terkunci</span>}
                    </label>
                    <input
                      type="text"
                      readOnly={hasSubmissions}
                      disabled={hasSubmissions}
                      placeholder="Contoh: Informatika"
                      value={prodi}
                      onChange={(e) => setProdi(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] ${
                        hasSubmissions ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none' : ''
                      }`}
                    />
                  </div>
                </>
              )}

              {/* KHUSUS DOSEN / STAFF USK */}
              {kelompok === 'DOSEN_STAFF_USK' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      NIP / NIDN <span className="text-red-500">*</span>
                      {hasSubmissions && <span className="ml-2 text-2xs text-amber-700 font-bold">🔒 Terkunci</span>}
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={hasSubmissions}
                      disabled={hasSubmissions}
                      placeholder="NIP Pegawai atau NIDN"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] ${
                        hasSubmissions ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none' : ''
                      }`}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Unit Kerja / Fakultas <span className="text-red-500">*</span>
                      {hasSubmissions && <span className="ml-2 text-2xs text-amber-700 font-bold">🔒 Terkunci</span>}
                    </label>
                    <input
                      type="text"
                      required
                      readOnly={hasSubmissions}
                      disabled={hasSubmissions}
                      placeholder="Contoh: Biro Akademik / Fakultas Kedokteran"
                      value={unitKerja}
                      onChange={(e) => setUnitKerja(e.target.value)}
                      className={`w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] ${
                        hasSubmissions ? 'bg-gray-100 text-gray-500 cursor-not-allowed select-none' : ''
                      }`}
                    />
                  </div>
                </>
              )}

              {/* KHUSUS MASYARAKAT UMUM */}
              {kelompok === 'MASYARAKAT_UMUM' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Pekerjaan Saat Ini
                      {hasSubmissions && <span className="ml-2 text-2xs text-emerald-700 font-bold">✓ Dapat Diubah</span>}
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Wiraswasta / Buruh Harian / Ibu Rumah Tangga"
                      value={pekerjaan}
                      onChange={(e) => setPekerjaan(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Alamat Domisili <span className="text-red-500">*</span>
                      {hasSubmissions && <span className="ml-2 text-2xs text-emerald-700 font-bold">✓ Dapat Diubah</span>}
                    </label>
                    <textarea
                      required
                      rows={2}
                      placeholder="Alamat tempat tinggal saat ini"
                      value={alamat}
                      onChange={(e) => setAlamat(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SECTION 2: BERKAS PERMANEN */}
          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div>
              <h3 className="text-sm font-black text-gray-900">
                2. Berkas Dokumen Permanen (KTP, KTM, KK)
              </h3>
              <p className="text-[11px] text-gray-400">
                {hasSubmissions
                  ? 'Berkas ini telah terkunci permanen sesuai riwayat pendaftaran Anda.'
                  : 'Unggah dokumen foto/scan (JPG, PNG, atau PDF). Sistem akan memeriksa keaslian dan kesesuaian berkas secara otomatis.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Berkas KTP (Semua Kelompok) */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800">Scan KTP Asli</span>
                  {ktpUrl && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Terunggah
                    </span>
                  )}
                </div>
                {hasSubmissions ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-2xs text-amber-800 font-bold">🔒 Terkunci dari Riwayat Pendaftaran</span>
                    {ktpUrl && (
                      <a
                        href={ktpUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#005621] hover:underline font-bold"
                      >
                        Lihat Berkas ↗
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload('ktp', f);
                      }}
                      className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#005621] file:text-white cursor-pointer"
                    />
                    {uploadingField === 'ktp' && (
                      <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Mengunggah KTP…
                      </p>
                    )}
                  </>
                )}
              </div>

              {/* Berkas KTM (Khusus Mahasiswa) */}
              {kelompok === 'MAHASISWA_USK' && (
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-800">Kartu Tanda Mahasiswa (KTM)</span>
                    {ktmUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✓ Terunggah
                      </span>
                    )}
                  </div>
                  {hasSubmissions ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-2xs text-amber-800 font-bold">🔒 Terkunci dari Riwayat Pendaftaran</span>
                      {ktmUrl && (
                        <a
                          href={ktmUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#005621] hover:underline font-bold"
                        >
                          Lihat Berkas ↗
                        </a>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('ktm', f);
                        }}
                        className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#005621] file:text-white cursor-pointer"
                      />
                      {uploadingField === 'ktm' && (
                        <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Mengunggah KTM…
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Berkas Kartu Pegawai / SK (Khusus Dosen/Staff) */}
              {kelompok === 'DOSEN_STAFF_USK' && (
                <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-gray-800">Kartu Pegawai / SK Tugas</span>
                    {kartuPegawaiUrl && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                        ✓ Terunggah
                      </span>
                    )}
                  </div>
                  {hasSubmissions ? (
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-2xs text-amber-800 font-bold">🔒 Terkunci dari Riwayat Pendaftaran</span>
                      {kartuPegawaiUrl && (
                        <a
                          href={kartuPegawaiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#005621] hover:underline font-bold"
                        >
                          Lihat Berkas ↗
                        </a>
                      )}
                    </div>
                  ) : (
                    <>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload('pegawai', f);
                        }}
                        className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#005621] file:text-white cursor-pointer"
                      />
                      {uploadingField === 'pegawai' && (
                        <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                          <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Mengunggah Kartu Pegawai…
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Berkas KK (Semua Kelompok) */}
              <div className="p-4 rounded-2xl border border-gray-200 bg-gray-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-gray-800">Kartu Keluarga (KK)</span>
                  {kkUrl && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      ✓ Terunggah
                    </span>
                  )}
                </div>
                {hasSubmissions ? (
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-2xs text-amber-800 font-bold">🔒 Terkunci dari Riwayat Pendaftaran</span>
                    {kkUrl && (
                      <a
                        href={kkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#005621] hover:underline font-bold"
                      >
                        Lihat Berkas ↗
                      </a>
                    )}
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFileUpload('kk', f);
                      }}
                      className="text-xs text-gray-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#005621] file:text-white cursor-pointer"
                    />
                    {uploadingField === 'kk' && (
                      <p className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> Mengunggah KK…
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex items-center justify-end border-t border-gray-100">
            <button
              type="submit"
              disabled={submitting || (!hasSubmissions && !!uploadingField)}
              className="px-8 py-3 rounded-xl bg-[#005621] hover:bg-[#004219] text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  <span>{hasSubmissions ? 'Menyimpan Perubahan…' : 'Memverifikasi Berkas & Menyimpan…'}</span>
                </>
              ) : (
                <>
                  <span>{hasSubmissions ? 'Simpan Perubahan Kontak' : 'Simpan & Lanjutkan'}</span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
