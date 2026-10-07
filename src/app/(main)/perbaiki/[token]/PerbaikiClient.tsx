'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faExclamationTriangle,
  faUpload,
  faCheckCircle,
  faArrowLeft,
  faFilePdf,
  faCheck,
  faInfoCircle,
  faFileAlt,
  faExternalLinkAlt,
  faLock,
} from '@fortawesome/free-solid-svg-icons';

interface BiodataField {
  id: string;
  key: string;
  label: string;
  tipe: string;
  options: string[];
  required: boolean;
  order: number;
}

interface DocumentField {
  id: string;
  key: string;
  label: string;
  required: boolean;
  maxAgeMonths: number | null;
  nameCheckApplicable: boolean;
  isSingleCombinedUpload: boolean;
  order: number;
}

interface SubmissionDoc {
  id: string;
  fieldKey: string;
  originalFilename: string;
  fileUrl: string;
  fileSizeBytes: number | null;
  needsRevision: boolean;
  revisionNote: string | null;
}

interface SubmissionData {
  id: string;
  token: string;
  status: string;
  biodataValues: Record<string, any>;
  warnings: {
    fieldKey: string;
    fieldLabel: string;
    type: string;
    message: string;
    severity: string;
  }[];
  linkDokumenGabungan: string | null;
  submittedAt: string | Date;
  program: {
    id: string;
    nama: string;
    slug: string;
    tanggalBuka?: string | Date | null;
    tanggalTutup?: string | Date | null;
    status?: string;
    biodataFields: BiodataField[];
    documentFields: DocumentField[];
  };
  documents: SubmissionDoc[];
}

export default function PerbaikiClient({ submission }: { submission: SubmissionData }) {
  // State Biodata
  const [biodataValues, setBiodataValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    const existing = submission.biodataValues || {};
    submission.program.biodataFields.forEach((field) => {
      initial[field.key] = existing[field.key] !== undefined && existing[field.key] !== null ? String(existing[field.key]) : '';
    });
    return initial;
  });

  // State Berkas Pengganti
  const [selectedFiles, setSelectedFiles] = useState<Record<string, File>>({});
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');

  // Cek apakah pendaftaran terkunci
  const isPastDue = submission.program.tanggalTutup ? new Date() > new Date(submission.program.tanggalTutup) : false;
  const isProgramClosed = submission.program.status && submission.program.status !== 'dibuka';
  const isLolos = submission.status === 'lolos';
  const isTidakLolos = submission.status === 'tidak_lolos';
  const isLocked = isPastDue || isProgramClosed || isLolos || isTidakLolos;

  // Map warning dokumen
  const warningMap = new Map<string, string[]>();
  (submission.warnings || []).forEach((w) => {
    if (['missing_document', 'keyword_mismatch', 'expired_document', 'name_mismatch'].includes(w.type)) {
      const existing = warningMap.get(w.fieldKey) || [];
      existing.push(w.message);
      warningMap.set(w.fieldKey, existing);
    }
  });

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

  const handleFileChange = (fieldKey: string, file: File | null) => {
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Ukuran berkas maksimal 10MB.');
        return;
      }
      setSelectedFiles((prev) => ({ ...prev, [fieldKey]: file }));
    } else {
      setSelectedFiles((prev) => {
        const next = { ...prev };
        delete next[fieldKey];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) return;

    setErrorMsg('');
    setFieldErrors({});

    // Validasi Biodata Wajib
    const errors: Record<string, string> = {};
    submission.program.biodataFields.forEach((field) => {
      const val = (biodataValues[field.key] || '').trim();
      if (field.required && !val) {
        errors[`biodata_${field.key}`] = `${field.label} wajib diisi.`;
      } else if (field.key.toLowerCase().includes('email') && val) {
        if (!val.includes('@') || !val.includes('.')) {
          errors[`biodata_${field.key}`] = 'Format alamat email tidak valid.';
        }
      }
    });

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setErrorMsg('Harap lengkapi semua kolom biodata wajib sebelum menyimpan.');
      window.scrollTo({ top: 200, behavior: 'smooth' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('token', submission.token);

      // Masukkan Biodata
      Object.entries(biodataValues).forEach(([k, v]) => {
        formData.append(`biodata_${k}`, v);
      });

      // Masukkan File Pengganti
      Object.entries(selectedFiles).forEach(([key, file]) => {
        formData.append(`reupload_${key}`, file);
      });

      const res = await fetch('/api/pendaftaran/perbaiki', {
        method: 'POST',
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Gagal menyimpan perbaikan data.');
      }

      setSuccessMsg(json.message);
      window.scrollTo({ top: 50, behavior: 'smooth' });
    } catch (err: any) {
      console.error('[Perbaiki Error]', err);
      setErrorMsg(err.message || 'Terjadi kesalahan sistem saat menyimpan perbaikan.');
    } finally {
      setSubmitting(false);
    }
  };

  // TAMPILAN SUKSES SIMPAN
  if (successMsg) {
    return (
      <div className="min-h-screen bg-gray-50/60 py-12 sm:py-16 px-4 sm:px-6 lg:px-8 font-sans">
        <div className="max-w-xl mx-auto bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-10 text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 text-[#005621] border border-emerald-200/60 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-2xs">
            <FontAwesomeIcon icon={faCheckCircle} />
          </div>
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-2xs font-extrabold uppercase tracking-wider bg-emerald-50 text-[#005621] border border-emerald-200/80">
              <FontAwesomeIcon icon={faCheck} className="text-3xs" />
              <span>Perbaikan Berhasil Disimpan</span>
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight">
              Data &amp; Berkas Telah Diperbarui
            </h1>
            <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
              {successMsg}
            </p>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/pendaftaran"
              className="w-full sm:w-auto py-2.5 px-6 bg-[#005621] hover:bg-[#004218] text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              Kembali ke Katalog Program
            </Link>
            <button
              type="button"
              onClick={() => {
                setSuccessMsg('');
                setSelectedFiles({});
              }}
              className="w-full sm:w-auto py-2.5 px-6 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 font-bold text-xs rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              Lihat Kembali Formulir
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            <span>Kembali ke Portal Pendaftaran</span>
          </Link>
        </div>

        {/* PROGRAM BANNER CARD */}
        <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-7 space-y-3 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#005621] via-emerald-600 to-[#f5b016]" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-2xs font-extrabold uppercase tracking-wider text-[#005621] bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200/60">
                Program: {submission.program.nama}
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight mt-1">
                Perbaikan Data &amp; Berkas Pendaftaran
              </h1>
              <p className="text-xs text-gray-500 font-normal leading-relaxed max-w-2xl">
                Periksa kembali isian biodata dan berkas dokumen Anda. Anda dapat mengoreksi data yang salah ketik atau mengunggah ulang dokumen yang perlu diperbaiki.
              </p>
            </div>

            <div className="text-left sm:text-right shrink-0 bg-gray-50 sm:bg-transparent p-3 sm:p-0 rounded-xl border border-gray-100 sm:border-0">
              <span className="text-2xs text-gray-400 block font-semibold">Token Pendaftaran:</span>
              <span className="font-mono font-black text-xs text-gray-800 bg-gray-100 px-2.5 py-1 rounded-lg border border-gray-200 inline-block mt-0.5 select-all">
                {submission.token}
              </span>
            </div>
          </div>
        </div>

        {/* STATUS ALERT KUNCI (JIKA FORM SUDAH DIKUNCI) */}
        {isLocked && (
          <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 shadow-2xs">
            <FontAwesomeIcon icon={faLock} className="text-amber-600 text-base shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <p className="font-bold">Formulir Pendaftaran Sedang Dikunci</p>
              <p className="text-amber-800 font-normal leading-relaxed">
                {isLolos
                  ? 'Selamat! Pendaftaran Anda telah dinyatakan LOLOS SELEKSI oleh panitia. Seluruh data dan berkas sudah dikunci.'
                  : isTidakLolos
                  ? 'Pendaftaran Anda telah selesai diseleksi oleh panitia. Data tidak dapat diubah lagi.'
                  : 'Masa pendaftaran dan perbaikan berkas untuk program ini telah berakhir sehingga formulir tidak menerima pembaruan lagi.'}
              </p>
            </div>
          </div>
        )}

        {/* GLOBAL ERROR NOTIFICATION */}
        {errorMsg && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 font-medium flex items-start gap-3 shadow-2xs">
            <FontAwesomeIcon icon={faExclamationTriangle} className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>{errorMsg}</div>
          </div>
        )}

        {/* FORM PERBAIKAN */}
        <form onSubmit={handleSubmit} noValidate className="space-y-6">

          {/* BAGIAN 1: DATA DIRI & IDENTITAS PENDAFTAR */}
          {submission.program.biodataFields.length > 0 && (
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
                      Koreksi atau perbarui informasi data diri Anda jika sebelumnya ada kesalahan pengetikan.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                {submission.program.biodataFields.map((field) => {
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
                          disabled={isLocked}
                          value={value}
                          onChange={(e) => handleBiodataChange(field.key, e.target.value)}
                          placeholder={placeholder}
                          className={`w-full px-3.5 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white border rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#005621]/15 focus:border-[#005621] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${
                            error ? 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/20' : 'border-gray-200'
                          }`}
                        />
                      )}

                      {/* Tipe Textarea */}
                      {field.tipe === 'textarea' && (
                        <textarea
                          rows={3}
                          disabled={isLocked}
                          value={value}
                          onChange={(e) => handleBiodataChange(field.key, e.target.value)}
                          placeholder={`Tuliskan ${field.label.toLowerCase()} secara lengkap...`}
                          className={`w-full px-3.5 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white border rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#005621]/15 focus:border-[#005621] disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${
                            error ? 'border-rose-300 ring-1 ring-rose-300 bg-rose-50/20' : 'border-gray-200'
                          }`}
                        />
                      )}

                      {/* Tipe Select */}
                      {field.tipe === 'select' && (
                        <select
                          disabled={isLocked}
                          value={value}
                          onChange={(e) => handleBiodataChange(field.key, e.target.value)}
                          className={`w-full px-3.5 py-2.5 bg-gray-50/50 hover:bg-white focus:bg-white border rounded-xl text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-[#005621]/15 focus:border-[#005621] cursor-pointer disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed ${
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
                                isLocked ? 'opacity-70 cursor-not-allowed' : ''
                              } ${
                                value === opt
                                  ? 'border-[#005621] bg-emerald-50/40 text-[#005621] font-bold'
                                  : 'border-gray-200 bg-gray-50/50 hover:bg-white text-gray-700'
                              }`}
                            >
                              <input
                                type="radio"
                                disabled={isLocked}
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
                        <p className="text-2xs text-rose-600 font-medium flex items-center gap-1 mt-1">
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

          {/* BAGIAN 2: BERKAS PERSYARATAN (DOKUMEN) */}
          {submission.program.documentFields.length > 0 && (
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
                      Pilih berkas baru hanya pada dokumen yang ingin Anda ganti atau perbaiki.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-3.5">
                {submission.program.documentFields.map((docField) => {
                  const warnings = warningMap.get(docField.key) || [];
                  const isProblematic = warnings.length > 0;
                  const existingDoc = submission.documents.find((d) => d.fieldKey === docField.key);
                  const selectedFile = selectedFiles[docField.key];

                  return (
                    <div
                      key={docField.id}
                      className={`p-4 sm:p-5 rounded-xl border transition-all ${
                        isProblematic
                          ? 'border-amber-300 bg-amber-50/30'
                          : selectedFile
                          ? 'border-emerald-300 bg-emerald-50/20'
                          : 'border-gray-200 bg-gray-50/40 hover:bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Sisi Kiri: Info Nama Dokumen & Catatan Warning */}
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <label className="block text-xs font-bold text-gray-700 leading-snug">
                              {docField.label}
                              {docField.required ? (
                                <span className="text-rose-500 ml-1">*</span>
                              ) : (
                                <span className="text-gray-400 font-normal ml-1">(Opsional)</span>
                              )}
                            </label>

                            {isProblematic && (
                              <span className="text-3xs font-extrabold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">
                                Perlu Diperbaiki
                              </span>
                            )}
                            {!isProblematic && existingDoc && (
                              <span className="text-3xs font-extrabold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                Sudah Terunggah
                              </span>
                            )}
                          </div>

                          {/* Info berkas sebelumnya */}
                          {existingDoc && (
                            <div className="flex items-center gap-2 text-2xs text-gray-500">
                              <FontAwesomeIcon icon={faFileAlt} className="text-gray-400 text-3xs" />
                              <span className="truncate max-w-[200px]">{existingDoc.originalFilename}</span>
                              {existingDoc.fileUrl && (
                                <a
                                  href={existingDoc.fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-[#005621] hover:underline inline-flex items-center gap-1 font-semibold"
                                >
                                  <span>Lihat File</span>
                                  <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs" />
                                </a>
                              )}
                            </div>
                          )}

                          {/* Catatan Warning Otomatis jika ada */}
                          {warnings.length > 0 && (
                            <div className="space-y-1 pt-1">
                              {warnings.map((msg, widx) => (
                                <p key={widx} className="text-xs text-amber-900 font-semibold flex items-center gap-1.5 bg-amber-100/60 p-2 rounded-lg border border-amber-200">
                                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 text-2xs shrink-0" />
                                  <span>{msg}</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Sisi Kanan: Kontrol Unggah File Baru */}
                        {!isLocked && (
                          <div className="flex items-center gap-3 shrink-0 self-stretch sm:self-auto justify-between sm:justify-end">
                            {selectedFile ? (
                              <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-emerald-300 shadow-2xs max-w-full">
                                <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-sm shrink-0" />
                                <div className="min-w-0 max-w-[140px] sm:max-w-[180px]">
                                  <p className="text-xs font-bold text-gray-900 truncate">{selectedFile.name}</p>
                                  <p className="text-[11px] text-gray-500 font-mono">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleFileChange(docField.key, null)}
                                  className="ml-2 px-2.5 py-1 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-700 text-[11px] font-bold border border-gray-200 cursor-pointer transition-colors shrink-0"
                                >
                                  Batal
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2.5">
                                <label className="px-4 py-2 rounded-xl bg-white border border-gray-300 hover:border-[#005621] text-gray-700 hover:text-[#005621] font-bold text-xs inline-flex items-center gap-2 shadow-2xs transition-colors cursor-pointer group">
                                  <FontAwesomeIcon icon={faUpload} className="text-[#005621] transition-transform group-hover:-translate-y-0.5" />
                                  <span>{existingDoc ? 'Ganti Berkas' : 'Unggah Berkas'}</span>
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
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* BAGIAN 3: SUBMIT BUTTON */}
          {!isLocked && (
            <div className="bg-white rounded-2xl border border-gray-200/80 shadow-xs p-6 sm:p-7 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-gray-500 flex items-center gap-2">
                <FontAwesomeIcon icon={faInfoCircle} className="text-blue-500 w-3.5 h-3.5 shrink-0" />
                <span>Data dan berkas baru akan otomatis masuk kembali ke antrean verifikasi sistem.</span>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 py-3 px-8 bg-[#005621] hover:bg-[#004218] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs hover:shadow-sm transition-all duration-200 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Menyimpan Perubahan...</span>
                  </>
                ) : (
                  <>
                    <span>Simpan Perubahan Data &amp; Berkas</span>
                    <FontAwesomeIcon icon={faCheck} className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}

        </form>

      </div>
    </div>
  );
}
