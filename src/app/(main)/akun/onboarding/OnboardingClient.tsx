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
  faLock,
  faIdCard,
  faPhone,
  faArrowRight,
} from '@fortawesome/free-solid-svg-icons';

interface Props {
  user: UserSessionData;
  existingProfile: any;
  initialKelompok: 'MAHASISWA_USK' | 'DOSEN_STAFF_USK' | 'MASYARAKAT_UMUM';
  isLocked: boolean;
  availableOptions: Array<{ id: string; label: string }>;
}

export default function OnboardingClient({
  user,
  existingProfile,
  initialKelompok,
  isLocked,
  availableOptions,
}: Props) {
  const router = useRouter();
  const [kelompok, setKelompok] = useState<'MAHASISWA_USK' | 'DOSEN_STAFF_USK' | 'MASYARAKAT_UMUM'>(
    existingProfile?.kelompok || initialKelompok
  );

  // Form State
  const [namaLengkap, setNamaLengkap] = useState(existingProfile?.namaLengkap || user.name || '');
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
        setErrorMsg(res.error || 'Gagal menyimpan profil Single Identity.');
        return;
      }

      setSuccessMsg('Profil Single Identity berhasil disimpan! Mengalihkan ke halaman akun…');
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
        {/* Header */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-[#005621] text-xs font-black border border-emerald-200">
              <FontAwesomeIcon icon={faIdCard} /> Single Identity Rumah Amal
            </span>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900">
              Lengkapi Profil Biodata & Berkas
            </h1>
            <p className="text-xs text-gray-500 max-w-xl">
              Cukup isi data permanen satu kali saja. Saat mendaftar program di kemudian hari, Anda tidak perlu mengunggah ulang data ini.
            </p>
          </div>
          <div className="p-3 bg-gray-50 rounded-2xl border border-gray-100 text-right shrink-0">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Email Akun</p>
            <p className="text-xs font-black text-gray-800">{user.email}</p>
          </div>
        </div>

        {/* Tab Switcher / Locked Banner */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
            <div>
              <h2 className="text-sm font-black text-gray-900">Kelompok Pendaftar</h2>
              <p className="text-xs text-gray-400">
                Pilih atau pastikan kelompok Anda sesuai identitas
              </p>
            </div>
            {isLocked && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full text-xs font-bold">
                <FontAwesomeIcon icon={faLock} className="text-2xs" /> Terkunci Otomatis via Email Kampus
              </span>
            )}
          </div>

          {/* Opsi Tab Switch */}
          {isLocked ? (
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#005621] text-white flex items-center justify-center shrink-0">
                <FontAwesomeIcon icon={kelompok === 'MAHASISWA_USK' ? faGraduationCap : faBriefcase} className="text-lg" />
              </div>
              <div>
                <p className="text-xs font-black text-gray-900">
                  {kelompok === 'MAHASISWA_USK' ? 'Mahasiswa USK Terverifikasi' : 'Dosen / Staff USK Terverifikasi'}
                </p>
                <p className="text-[11px] text-gray-600">
                  Sistem otomatis mengarahkan ke formulir {kelompok === 'MAHASISWA_USK' ? 'Mahasiswa USK' : 'Dosen & Staff USK'} berdasarkan domain email Anda ({user.email}).
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-1.5 bg-gray-100/80 rounded-2xl">
              {availableOptions.map((opt) => {
                const active = kelompok === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => {
                      setKelompok(opt.id as any);
                      setErrorMsg('');
                    }}
                    className={`py-3 px-4 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      active
                        ? 'bg-white text-[#005621] shadow-sm ring-1 ring-black/5'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-white/60'
                    }`}
                  >
                    <FontAwesomeIcon
                      icon={
                        opt.id === 'MAHASISWA_USK'
                          ? faGraduationCap
                          : opt.id === 'DOSEN_STAFF_USK'
                          ? faBriefcase
                          : faUsers
                      }
                      className={active ? 'text-[#005621]' : 'text-gray-400'}
                    />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Form Biodata & Berkas (Dinamis Sesuai Tab Kelompok) */}
        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 space-y-6">
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
                </label>
                <input
                  type="text"
                  required
                  placeholder="Sesuai KTP / Berkas Resmi"
                  value={namaLengkap}
                  onChange={(e) => setNamaLengkap(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  NIK (Nomor Induk Kependudukan) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  placeholder="16 digit NIK KTP"
                  value={nik}
                  onChange={(e) => setNik(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nomor WhatsApp Aktif <span className="text-red-500">*</span>
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
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 2108107010001"
                      value={npm}
                      onChange={(e) => setNpm(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Fakultas <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Fakultas MIPA"
                      value={fakultas}
                      onChange={(e) => setFakultas(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Program Studi / Jurusan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Informatika"
                      value={prodi}
                      onChange={(e) => setProdi(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
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
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="NIP Pegawai atau NIDN"
                      value={nip}
                      onChange={(e) => setNip(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Unit Kerja / Fakultas <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Biro Akademik / Fakultas Kedokteran"
                      value={unitKerja}
                      onChange={(e) => setUnitKerja(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
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
                2. Berkas Permanen (Single Identity Berkas)
              </h3>
              <p className="text-[11px] text-gray-400">
                Unggah dokumen foto/scan (JPG, PNG, atau PDF). Berkas ini akan tersimpan permanen di akun Anda.
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
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
            <Link
              href="/"
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Isi Nanti
            </Link>
            <button
              type="submit"
              disabled={submitting || !!uploadingField}
              className="px-7 py-2.5 rounded-xl bg-[#005621] hover:bg-[#004219] text-white font-black text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  <span>Menyimpan…</span>
                </>
              ) : (
                <>
                  <span>Simpan Single Identity & Lanjutkan</span>
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
