'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCalendarAlt,
  faFolderOpen,
  faUpload,
  faCheckCircle,
  faExclamationTriangle,
  faArrowLeft,
  faFilePdf,
  faCheck,
  faInfoCircle,
  faExternalLinkAlt,
  faEdit,
  faEnvelope,
  faUserCheck,
} from '@fortawesome/free-solid-svg-icons';

interface DocumentField {
  id: string;
  key: string;
  label: string;
  required: boolean;
  maxAgeMonths: number | null;
  nameCheckApplicable: boolean;
  isSingleCombinedUpload: boolean;
  needsStampCheck: boolean;
}

interface BiodataField {
  id: string;
  key: string;
  label: string;
  tipe: string; // text | number | select | date | textarea | radio
  options: string[];
  required: boolean;
}

interface ProgramData {
  id: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  gambarUrl: string | null;
  status: string;
  batchAktif?: string | null;
  tanggalBuka: Date | string | null;
  tanggalTutup: Date | string | null;
  linkDriveTemplate: string | null;
  documentFields: DocumentField[];
  biodataFields: BiodataField[];
}

export interface FormPendaftaranClientProps {
  program: ProgramData;
  userSession?: {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    kelompok: 'MAHASISWA_USK' | 'DOSEN_STAFF_USK' | 'MASYARAKAT_UMUM' | null;
    isProfileCompleted: boolean;
  } | null;
  userProfile?: {
    id?: string;
    userAccountId?: string;
    kelompok: string;
    namaLengkap: string;
    nik: string;
    noWa: string;
    npm?: string | null;
    fakultas?: string | null;
    prodi?: string | null;
    nip?: string | null;
    unitKerja?: string | null;
    alamat?: string | null;
    pekerjaan?: string | null;
    ktpUrl?: string | null;
    ktmUrl?: string | null;
    kartuPegawaiUrl?: string | null;
    kkUrl?: string | null;
    isCompleted?: boolean;
  } | null;
}

export default function FormPendaftaranClient({
  program,
  userSession,
  userProfile,
}: FormPendaftaranClientProps) {
  // Inisialisasi awal biodata dari profil Single Identity pendaftar
  const initialBiodata = useMemo(() => {
    const init: Record<string, string> = {};
    if (!userProfile && !userSession) return init;

    const fields = program.biodataFields || [];
    fields.forEach((field) => {
      const k = field.key.toLowerCase();
      if (k.includes('email') && userSession?.email) {
        init[field.key] = userSession.email;
      } else if (
        (k === 'nama' || k.includes('nama_lengkap') || k.includes('nama_mahasiswa') || k === 'name') &&
        (userProfile?.namaLengkap || userSession?.name)
      ) {
        init[field.key] = userProfile?.namaLengkap || userSession?.name || '';
      } else if ((k === 'nik' || k.includes('ktp')) && userProfile?.nik) {
        init[field.key] = userProfile.nik;
      } else if (
        (k.includes('wa') || k.includes('hp') || k.includes('telp') || k.includes('kontak')) &&
        userProfile?.noWa
      ) {
        init[field.key] = userProfile.noWa;
      } else if (
        (k === 'npm' || k === 'nim' || k.includes('mahasiswa') || k.includes('npm')) &&
        userProfile?.npm
      ) {
        init[field.key] = userProfile.npm;
      } else if (k.includes('fakultas') && userProfile?.fakultas) {
        init[field.key] = userProfile.fakultas;
      } else if ((k.includes('prodi') || k.includes('jurusan')) && userProfile?.prodi) {
        init[field.key] = userProfile.prodi;
      } else if (k === 'nip' && userProfile?.nip) {
        init[field.key] = userProfile.nip;
      } else if ((k.includes('unit') || k.includes('instansi')) && userProfile?.unitKerja) {
        init[field.key] = userProfile.unitKerja;
      } else if ((k.includes('alamat') || k.includes('domisili')) && userProfile?.alamat) {
        init[field.key] = userProfile.alamat;
      } else if (k.includes('pekerjaan') && userProfile?.pekerjaan) {
        init[field.key] = userProfile.pekerjaan;
      }
    });

    if (userSession?.email && !init['email']) {
      init['email'] = userSession.email;
    }

    return init;
  }, [userProfile, userSession, program.biodataFields]);

  // State Biodata
  const [biodataValues, setBiodataValues] = useState<Record<string, string>>(() => initialBiodata);
  // State File uploads (key -> File)
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  // State Client validation errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [aggreement, setAggreement] = useState(false);


  // Submission state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [duplicateToken, setDuplicateToken] = useState<string | null>(null);
  const [submissionSuccess, setSubmissionSuccess] = useState<{
    token: string;
    message: string;
    submittedAt: string;
    email?: string;
  } | null>(null);

  // Pastikan kolom email selalu ada pada biodata jika belum diset dari admin
  const effectiveBiodataFields = useMemo(() => {
    const fields = [...(program.biodataFields || [])];
    const hasEmail = fields.some(
      (f) => f.key.toLowerCase() === 'email' || f.key.toLowerCase().includes('email')
    );
    if (!hasEmail) {
      fields.push({
        id: `auto_email_${program.id}`,
        key: 'email',
        label: 'Alamat Email Aktif',
        tipe: 'text',
        options: [],
        required: true,
      });
    }
    return fields;
  }, [program.biodataFields, program.id]);

  const isClosed = program.status !== 'dibuka';
  const now = new Date();
  const isPastDue = program.tanggalTutup ? now > new Date(program.tanggalTutup) : false;

  const formatDate = (date: Date | string | null) => {
    if (!date) return 'Tidak ditentukan';
    return new Date(date).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const handleBiodataChange = (key: string, value: string) => {
    setBiodataValues((prev) => ({ ...prev, [key]: value }));
    if (fieldErrors[`biodata_${key}`]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[`biodata_${key}`];
        return next;
      });
    }
  };

  const handleFileChange = (key: string, file: File | null) => {
    if (file) {
      // Validasi ukuran maks 10MB
      if (file.size > 10 * 1024 * 1024) {
        setFieldErrors((prev) => ({
          ...prev,
          [`doc_${key}`]: 'Ukuran berkas maksimal 10MB.',
        }));
        return;
      }

      setSelectedFiles((prev) => ({ ...prev, [key]: file }));
      if (fieldErrors[`doc_${key}`]) {
        setFieldErrors((prev) => {
          const next = { ...prev };
          delete next[`doc_${key}`];
          return next;
        });
      }
    } else {
      setSelectedFiles((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  // Helper pencocokan berkas Single Identity
  const getExistingProfileDocUrl = (field: DocumentField): string | null => {
    if (!userProfile) return null;
    const k = field.key.toLowerCase();
    const l = field.label.toLowerCase();

    if (k === 'ktp' || k.includes('ktp') || l.includes('ktp') || l.includes('kartu tanda penduduk')) {
      return userProfile.ktpUrl || null;
    }
    if (
      k === 'ktm' ||
      k.includes('ktm') ||
      l.includes('ktm') ||
      l.includes('kartu tanda mahasiswa') ||
      l.includes('kartu mahasiswa')
    ) {
      return userProfile.ktmUrl || null;
    }
    if (
      k.includes('pegawai') ||
      k.includes('karpeg') ||
      l.includes('kartu pegawai') ||
      l.includes('id card pegawai')
    ) {
      return userProfile.kartuPegawaiUrl || null;
    }
    if (k === 'kk' || k.includes('kartu_keluarga') || l.includes('kartu keluarga') || l.includes(' kk')) {
      return userProfile.kkUrl || null;
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');
    setDuplicateToken(null);

    // 1. Validasi Client Side
    const errors: Record<string, string> = {};

    // Validasi Biodata
    effectiveBiodataFields.forEach((field) => {
      const val = (biodataValues[field.key] || '').trim();
      if (field.required && !val) {
        errors[`biodata_${field.key}`] = `${field.label} wajib diisi.`;
      } else if (field.key.toLowerCase().includes('email') && val) {
        if (!val.includes('@') || !val.includes('.')) {
          errors[`biodata_${field.key}`] = 'Format alamat email tidak valid.';
        }
      }
    });

    // Validasi Dokumen (terpenuhi jika file dipilih ATAU sudah ada di Single Identity)
    program.documentFields.forEach((docField) => {
      const file = selectedFiles[docField.key];
      const existingUrl = getExistingProfileDocUrl(docField);
      if (docField.required && !file && !existingUrl) {
        errors[`doc_${docField.key}`] = `Berkas ${docField.label} wajib diunggah.`;
      }
    });

    if (!aggreement) {
      errors.agreement = 'Anda wajib mencentang pernyataan kebenaran data.';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setSubmitError('Harap lengkapi semua isian biodata dan berkas yang wajib sebelum mengirim pendaftaran.');
      window.scrollTo({ top: 300, behavior: 'smooth' });
      return;
    }

    // 2. Siapkan FormData
    setSubmitting(true);
    try {
      const data = new FormData();
      data.append('programId', program.id);

      if (userSession?.id) {
        data.append('userAccountId', userSession.id);
      }

      Object.entries(biodataValues).forEach(([k, v]) => {
        data.append(`biodata_${k}`, v);
      });

      program.documentFields.forEach((docField) => {
        const file = selectedFiles[docField.key];
        const existingUrl = getExistingProfileDocUrl(docField);
        if (file) {
          data.append(`doc_${docField.key}`, file);
        } else if (existingUrl) {
          data.append(`existing_doc_${docField.key}`, existingUrl);
        }
      });

      const res = await fetch('/api/pendaftaran/submit', {
        method: 'POST',
        body: data,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.existingToken) {
          setDuplicateToken(json.existingToken);
        }
        // Gunakan setSubmitError + return (bukan throw) agar tidak memicu
        // Next.js development error overlay pada unhandled error in event handlers
        setSubmitError(json.error || 'Gagal mengirim formulir pendaftaran.');
        window.scrollTo({ top: 300, behavior: 'smooth' });
        return;
      }

      setSubmissionSuccess({
        token: json.token,
        email: json.email || biodataValues.email,
        message: json.message,
        submittedAt: json.submittedAt,
      });

      window.scrollTo({ top: 50, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[Submit Error]', err);
      setSubmitError(err.message || 'Terjadi kesalahan sistem saat mengirim formulir.');
    } finally {
      setSubmitting(false);
    }
  };

  // =========================================================================
  // TAMPILAN SUKSES PENDAFTARAN
  // =========================================================================
  if (submissionSuccess) {
    return (
      <div className="min-h-screen bg-gray-50/60 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-[#005621] border border-emerald-200/60 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-2xs">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>

          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold uppercase tracking-wider bg-emerald-50 text-[#005621] border border-emerald-200/80">
              <FontAwesomeIcon icon={faCheck} className="text-3xs" />
              <span>Pendaftaran Berhasil Dikirim</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Terima Kasih, Berkas Diterima!
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed max-w-md mx-auto font-normal">
              {submissionSuccess.message}
            </p>
          </div>

          {/* EMAIL NOTIFIKASI & LINK PERBAIKAN CARD */}
          <div className="p-5 sm:p-6 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 text-left space-y-3.5 shadow-2xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#005621] text-white flex items-center justify-center text-lg shrink-0 shadow-2xs mt-0.5">
                <FontAwesomeIcon icon={faEnvelope} />
              </div>
              <div className="space-y-1">
                <span className="text-2xs font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md">
                  Bukti &amp; Tautan Terkirim
                </span>
                <h3 className="text-sm font-bold text-gray-900">
                  Tautan Formulir Telah Dikirim ke Email Anda
                </h3>
                <p className="text-xs text-emerald-950 font-semibold break-all">
                  {submissionSuccess.email || biodataValues.email || '-'}
                </p>
              </div>
            </div>
            <div className="p-3 bg-white/90 rounded-xl border border-emerald-200/60 text-xs text-gray-600 leading-relaxed font-normal">
              Kami telah mengirimkan email berisi bukti tanda terima pendaftaran serta <strong>tautan langsung</strong> untuk melihat status atau memperbaiki data diri dan berkas Anda. Anda cukup membuka tautan dari email tanpa perlu mengingat atau memasukkan token pendaftaran.
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href={`/perbaiki/${submissionSuccess.token}`}
              className="w-full sm:w-auto py-2.5 px-6 bg-[#005621] hover:bg-[#004218] text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <FontAwesomeIcon icon={faEdit} />
              <span>Buka Formulir Saya Sekarang</span>
            </Link>
            <Link
              href="/pendaftaran"
              className="w-full sm:w-auto py-2.5 px-6 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer inline-flex items-center justify-center"
            >
              Kembali ke Katalog
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto py-2.5 px-6 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs inline-flex items-center justify-center"
            >
              Halaman Beranda
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // TAMPILAN PROGRAM DITUTUP
  // =========================================================================
  if (isClosed || isPastDue) {
    return (
      <div className="min-h-screen bg-gray-50/60 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 border border-rose-200/60 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-2xs">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Pendaftaran Ditutup</h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
              Mohon maaf, pendaftaran untuk program <strong className="font-bold text-gray-900">{program.nama}</strong> saat ini sedang tidak menerima berkas baru atau masa pendaftaran telah berakhir pada {formatDate(program.tanggalTutup)}.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/pendaftaran"
              className="inline-flex items-center gap-2 py-2.5 px-6 bg-[#005621] text-white font-bold text-xs rounded-xl hover:bg-[#004218] transition-all shadow-2xs cursor-pointer"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
              <span>Lihat Program Terbuka Lainnya</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // FORMULIR UTAMA PENDAFTARAN
  // =========================================================================
  return (
    <div className="min-h-screen bg-gray-50/60 pt-4 sm:pt-6 pb-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* BREADCRUMB */}
        <div className="flex items-center justify-between pb-0.5">
          <Link
            href="/pendaftaran"
            className="inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-[#005621] transition-colors group"
          >
            <FontAwesomeIcon icon={faArrowLeft} className="w-3 h-3 transition-transform group-hover:-translate-x-0.5" />
            <span>Kembali ke Katalog Program</span>
          </Link>
        </div>

        {/* PROGRAM BANNER CARD */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-8 space-y-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#005621] via-emerald-600 to-[#f5b016]" />

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
                Formulir Pendaftaran {program.nama}
              </h1>
              {program.batchAktif && (
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-[#005621] text-xs font-bold border border-emerald-200 shadow-2xs">
                  Batch: {program.batchAktif}
                </span>
              )}
            </div>
            {program.deskripsi && (
              <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal max-w-3xl">
                {program.deskripsi}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-gray-100 text-xs">
            <div className="inline-flex items-center gap-2 text-xs text-gray-600">
              <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#005621] flex items-center justify-center text-xs shrink-0">
                <FontAwesomeIcon icon={faCalendarAlt} />
              </span>
              <span>Batas Pendaftaran: <strong className="text-gray-900 font-bold">{formatDate(program.tanggalTutup)}</strong></span>
            </div>

            {/* Tombol Unduh Template Dokumen */}
            {program.linkDriveTemplate && (
              <a
                href={program.linkDriveTemplate}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 font-bold text-xs transition-all shadow-2xs cursor-pointer group"
              >
                <FontAwesomeIcon icon={faFolderOpen} className="text-amber-600 transition-transform group-hover:scale-110" />
                <span>Unduh Template Dokumen (Google Drive)</span>
                <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs opacity-70" />
              </a>
            )}
          </div>
        </div>

        {/* BANNER STATUS SINGLE IDENTITY / AKUN */}
        {userSession ? (
          <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/90 border border-emerald-200/90 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#005621] text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs">
                <FontAwesomeIcon icon={faUserCheck} />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-gray-900 text-xs sm:text-sm">
                    {userProfile?.namaLengkap || userSession.name || userSession.email}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wide bg-emerald-100 text-[#005621] border border-emerald-200">
                    {userSession.kelompok === 'MAHASISWA_USK'
                      ? 'Mahasiswa USK'
                      : userSession.kelompok === 'DOSEN_STAFF_USK'
                      ? 'Dosen / Staff USK'
                      : 'Masyarakat Umum'}
                  </span>
                </div>
                <p className="text-emerald-800 text-[11px] font-normal">
                  ✓ Biodata &amp; berkas Single Identity terlampir otomatis. Anda hanya perlu melengkapi isian dinamis program ini (seperti IPK/semester).
                </p>
              </div>
            </div>
            <Link
              href="/akun/onboarding"
              className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-emerald-100 text-[#005621] border border-emerald-200 font-bold text-2xs transition-colors shrink-0 shadow-2xs"
            >
              Kelola Single Identity
            </Link>
          </div>
        ) : (
          <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center text-sm font-bold shrink-0 shadow-2xs">
                <FontAwesomeIcon icon={faInfoCircle} />
              </div>
              <div className="space-y-0.5">
                <p className="font-bold text-gray-900 text-xs sm:text-sm">
                  Daftar Lebih Cepat dengan Akun Rumah Amal USK
                </p>
                <p className="text-blue-800 text-[11px] font-normal">
                  Masuk akun untuk melampirkan berkas KTP/KTM dan biodata Single Identity Anda secara otomatis tanpa repot upload ulang.
                </p>
              </div>
            </div>
            <Link
              href={`/masuk?redirect=/pendaftaran/${program.slug}`}
              className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shrink-0 shadow-2xs"
            >
              Masuk Akun
            </Link>
          </div>
        )}

        {/* FORM PENDAFTARAN */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">


          {/* ERROR GLOBAL NOTIFICATION */}
          {submitError && (
            <div className="p-4 sm:p-5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-3 shadow-2xs animate-fadeIn">
              <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-2.5 flex-1">
                <p className="leading-relaxed">{submitError}</p>
                {duplicateToken && (
                  <div>
                    <Link
                      href={`/perbaiki/${duplicateToken}`}
                      className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#005621] hover:bg-[#004218] text-white font-bold text-xs rounded-xl transition-all shadow-2xs"
                    >
                      <FontAwesomeIcon icon={faEdit} className="text-3xs" />
                      <span>Buka &amp; Perbaiki Formulir Saya</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* BAGIAN 1: DATA DIRI (BIODATA DINAMIS) */}
          {effectiveBiodataFields.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-7 space-y-5">
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-emerald-50 text-[#005621] border border-emerald-200/60 flex items-center justify-center text-xs font-bold shrink-0">
                    1
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                      Data Diri &amp; Identitas Pendaftar
                    </h2>
                    <p className="text-xs text-gray-500 font-normal mt-0.5">
                      Isikan informasi biodata Anda dengan data yang valid dan sesuai dokumen resmi.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {effectiveBiodataFields.map((field) => {
                  const error = fieldErrors[`biodata_${field.key}`];
                  const value = biodataValues[field.key] || '';
                  const isFullWidth = ['textarea', 'radio'].includes(field.tipe);
                  const isEmail = field.key.toLowerCase().includes('email');
                  const inputType = isEmail ? 'email' : field.tipe;
                  const placeholder = isEmail
                    ? 'Contoh: nama@gmail.com atau nama@mhs.usk.ac.id'
                    : `Masukkan ${field.label.toLowerCase()}...`;

                  return (
                    <div
                      key={field.id}
                      className={isFullWidth ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}
                    >
                      <label className="block text-xs font-bold text-gray-700">
                        {field.label}
                        {field.required ? (
                          <span className="text-rose-500 ml-1 font-bold">*</span>
                        ) : (
                          <span className="text-gray-400 font-normal ml-1">(Opsional)</span>
                        )}
                      </label>

                      {/* Tipe Text / Email / Number / Date */}
                      {['text', 'email', 'number', 'date'].includes(inputType) && (
                        <input
                          type={inputType}
                          value={value}
                          onChange={(e) => handleBiodataChange(field.key, e.target.value)}
                          placeholder={placeholder}
                          className={`w-full px-3.5 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white border rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#005621]/15 focus:border-[#005621] ${
                            error ? 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/20' : 'border-gray-200'
                          }`}
                        />
                      )}

                      {/* Tipe Textarea */}
                      {field.tipe === 'textarea' && (
                        <textarea
                          rows={3}
                          value={value}
                          onChange={(e) => handleBiodataChange(field.key, e.target.value)}
                          placeholder={`Tuliskan ${field.label.toLowerCase()} secara lengkap...`}
                          className={`w-full px-3.5 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white border rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#005621]/15 focus:border-[#005621] ${
                            error ? 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/20' : 'border-gray-200'
                          }`}
                        />
                      )}

                      {/* Tipe Select */}
                      {field.tipe === 'select' && (
                        <select
                          value={value}
                          onChange={(e) => handleBiodataChange(field.key, e.target.value)}
                          className={`w-full px-3.5 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white border rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#005621]/15 focus:border-[#005621] cursor-pointer ${
                            error ? 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/20' : 'border-gray-200'
                          }`}
                        >
                          <option value="">-- Pilih salah satu --</option>
                          {field.options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      )}

                      {/* Tipe Radio */}
                      {field.tipe === 'radio' && (
                        <div className="flex flex-wrap gap-3 pt-1">
                          {field.options.map((opt) => (
                            <label
                              key={opt}
                              className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-medium cursor-pointer transition-all ${
                                value === opt
                                  ? 'border-[#005621] bg-emerald-50/40 text-[#005621] font-bold'
                                  : 'border-gray-200 bg-gray-50/50 hover:bg-white text-gray-700'
                              }`}
                            >
                              <input
                                type="radio"
                                name={`radio_${field.key}`}
                                value={opt}
                                checked={value === opt}
                                onChange={(e) => handleBiodataChange(field.key, e.target.value)}
                                className="text-[#005621] focus:ring-[#005621] cursor-pointer"
                              />
                              <span>{opt}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      {error && (
                        <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-1">
                          <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xs" />
                          <span>{error}</span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BAGIAN 2: BERKAS PERSYARATAN (DOCUMENT FIELDS) */}
          {program.documentFields.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-7 space-y-5">
              <div className="border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-800 border border-amber-200/60 flex items-center justify-center text-xs font-bold shrink-0">
                    2
                  </span>
                  <div>
                    <h2 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                      Unggah Berkas Persyaratan
                    </h2>
                    <p className="text-xs text-gray-500 font-normal mt-0.5">
                      Format berkas yang diterima: PDF, JPG, atau PNG (Maksimal 10MB per berkas).
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                {program.documentFields.map((docField) => {
                  const error = fieldErrors[`doc_${docField.key}`];
                  const file = selectedFiles[docField.key];
                  const existingUrl = getExistingProfileDocUrl(docField);

                  return (
                    <div
                      key={docField.id}
                      className={`p-4 sm:p-5 rounded-xl border transition-all ${
                        error
                          ? 'border-rose-300 bg-rose-50/30'
                          : file || existingUrl
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-gray-200 bg-gray-50/40 hover:bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Sisi Kiri: Info Nama Dokumen & Syarat */}
                        <div className="space-y-1 min-w-0 flex-1">
                          <label className="block text-xs font-bold text-gray-700 leading-snug">
                            {docField.label}
                            {docField.required ? (
                              <span className="text-rose-500 ml-1">*</span>
                            ) : (
                              <span className="text-gray-400 font-normal ml-1">(Opsional)</span>
                            )}
                          </label>

                          {/* Chips Petunjuk Khusus & Single Identity Badge */}
                          <div className="flex flex-wrap items-center gap-2 pt-0.5">
                            {existingUrl && !file && (
                              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300 inline-flex items-center gap-1">
                                <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-3xs" />
                                <span>Terlampir Otomatis dari Single Identity Akun</span>
                              </span>
                            )}
                            {docField.maxAgeMonths && (
                              <span className="text-[11px] font-medium text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                Berlaku maks {docField.maxAgeMonths} bulan
                              </span>
                            )}
                            {docField.isSingleCombinedUpload && (
                              <span className="text-[11px] font-medium text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                Gabungkan foto jadi 1 file sebelum diunggah
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Sisi Kanan: Kontrol Unggah File */}
                        <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
                          {file ? (
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs max-w-full">
                              <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-sm shrink-0" />
                              <div className="min-w-0 max-w-[140px] sm:max-w-[180px]">
                                <p className="text-xs font-bold text-gray-900 truncate">{file.name}</p>
                                <p className="text-[11px] text-gray-500 font-mono">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                              </div>
                              <label
                                title="Ganti berkas ini"
                                className="ml-2 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-[11px] font-bold border border-gray-200 cursor-pointer transition-colors shrink-0"
                              >
                                <span>Ganti</span>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) =>
                                    handleFileChange(docField.key, e.target.files?.[0] || null)
                                  }
                                  className="hidden"
                                />
                              </label>
                              {existingUrl && (
                                <button
                                  type="button"
                                  onClick={() => handleFileChange(docField.key, null)}
                                  className="px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold border border-amber-200 cursor-pointer transition-colors"
                                  title="Batalkan file pilihan dan gunakan kembali berkas profil akun"
                                >
                                  Gunakan Berkas Akun
                                </button>
                              )}
                            </div>
                          ) : existingUrl ? (
                            <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs">
                              <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-sm shrink-0" />
                              <a
                                href={existingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-bold text-[#005621] hover:underline inline-flex items-center gap-1"
                              >
                                <span>Lihat Berkas Akun</span>
                                <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs" />
                              </a>
                              <label
                                title="Unggah berkas pengganti khusus pendaftaran ini"
                                className="ml-2 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-[11px] font-bold border border-gray-200 cursor-pointer transition-colors"
                              >
                                <span>Ganti File</span>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) =>
                                    handleFileChange(docField.key, e.target.files?.[0] || null)
                                  }
                                  className="hidden"
                                />
                              </label>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2.5">
                              <label className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:border-[#005621] text-gray-700 hover:text-[#005621] font-bold text-xs inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer group">
                                <FontAwesomeIcon icon={faUpload} className="text-[#005621] transition-transform group-hover:-translate-y-0.5" />
                                <span>Pilih Berkas</span>
                                <input
                                  type="file"
                                  accept=".pdf,.jpg,.jpeg,.png"
                                  onChange={(e) =>
                                    handleFileChange(docField.key, e.target.files?.[0] || null)
                                  }
                                  className="hidden"
                                />
                              </label>
                              <span className="text-xs text-gray-400 italic hidden sm:inline">Belum diunggah</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {error && (
                        <p className="text-xs text-rose-600 font-medium flex items-center gap-1 mt-2">
                          <FontAwesomeIcon icon={faExclamationTriangle} className="text-3xs" />
                          <span>{error}</span>
                        </p>
                      )}
                    </div>
                  );
                })}

              </div>
            </div>
          )}

          {/* BAGIAN 3: PERNYATAAN & SUBMIT */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-7 space-y-6">
            <div className="p-4 sm:p-5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-2">
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={aggreement}
                  onChange={(e) => {
                    setAggreement(e.target.checked);
                    if (fieldErrors.agreement) {
                      setFieldErrors((prev) => {
                        const next = { ...prev };
                        delete next.agreement;
                        return next;
                      });
                    }
                  }}
                  className="mt-0.5 w-4 h-4 text-[#005621] rounded border-gray-300 focus:ring-[#005621] cursor-pointer shrink-0"
                />
                <span className="text-xs text-gray-700 leading-relaxed font-normal">
                  Saya menyatakan dengan sesungguhnya bahwa seluruh data dan dokumen yang saya unggah adalah <strong className="font-bold text-gray-900">benar, sah, dan dapat dipertanggungjawabkan</strong>. Apabila di kemudian hari ditemukan pemalsuan atau ketidaksesuaian data, saya bersedia menerima sanksi pembatalan sesuai ketentuan Rumah Amal USK.
                </span>
              </label>

              {fieldErrors.agreement && (
                <p className="text-2xs text-rose-600 font-medium pl-7">{fieldErrors.agreement}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 w-3.5 h-3.5 shrink-0" />
                <span>Pastikan koneksi internet stabil sebelum menekan tombol kirim.</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-8 bg-[#005621] hover:bg-[#004218] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Mengirim Formulir &amp; Berkas...</span>
                  </>
                ) : (
                  <>
                    <span>Kirim Pendaftaran Sekarang</span>
                    <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
