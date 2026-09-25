'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faPlus,
  faSearch,
  faSliders,
  faUsers,
  faFileAlt,
  faListCheck,
  faFolderOpen,
  faPlay,
  faSpinner,
  faCalendarAlt,
  faEdit,
  faTrashAlt,
  faExternalLinkAlt,
  faCheckCircle,
  faClock,
  faExclamationTriangle,
} from '@fortawesome/free-solid-svg-icons';
import {
  createProgramBantuan,
  updateProgramBantuan,
  deleteProgramBantuan,
  toggleProgramStatus,
  triggerWorkerManual,
} from '@/actions/pendaftaran-admin';
import ConfirmModal from '@/components/admin/ConfirmModal';
import AdminToast, { ToastState } from '@/components/admin/AdminToast';

interface ProgramItem {
  id: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  gambarUrl: string | null;
  status: string;
  tanggalBuka: Date | string | null;
  tanggalTutup: Date | string | null;
  linkDriveTemplate: string | null;
  createdAt: Date | string;
  _count?: {
    documentFields: number;
    biodataFields: number;
    submissions: number;
  };
}

interface Props {
  initialPrograms: ProgramItem[];
  initialSearch: string;
  initialStatus: string;
  errorMessage?: string;
}

function ProgramCardCover({
  gambarUrl,
  nama,
}: {
  gambarUrl: string | null;
  nama: string;
}) {
  const [hasError, setHasError] = useState(false);

  if (gambarUrl && !hasError) {
    return (
      <img
        src={gambarUrl}
        alt={nama}
        className="w-full h-full object-cover"
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div className="w-full h-full flex flex-col items-center justify-center text-[#005621]/20">
      <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l9-5-9-5-9 5 9 5z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    </div>
  );
}

export default function PendaftaranClient({
  initialPrograms,
  initialSearch,
  initialStatus,
  errorMessage,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State pencarian & filter
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState(initialStatus);

  // State toast & modals
  const [toast, setToast] = useState<ToastState | null>(null);
  const [workerLoading, setWorkerLoading] = useState(false);

  // Modal Form Program
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramItem | null>(null);
  const [formNama, setFormNama] = useState('');
  const [formSlug, setFormSlug] = useState('');
  const [formDeskripsi, setFormDeskripsi] = useState('');
  const [formStatus, setFormStatus] = useState('draft');
  const [formTanggalBuka, setFormTanggalBuka] = useState('');
  const [formTanggalTutup, setFormTanggalTutup] = useState('');
  const [formLinkDriveTemplate, setFormLinkDriveTemplate] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Modal Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Filter list program lokal
  const filteredPrograms = initialPrograms.filter((p) => {
    const matchSearch =
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      (p.deskripsi && p.deskripsi.toLowerCase().includes(search.toLowerCase()));
    const matchStatus = statusFilter === 'all' || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Hitung ringkasan status
  const totalBuka = initialPrograms.filter((p) => p.status === 'dibuka').length;
  const totalTutup = initialPrograms.filter((p) => p.status === 'ditutup').length;
  const totalDraft = initialPrograms.filter((p) => p.status === 'draft').length;

  function openAddModal() {
    setEditingProgram(null);
    setFormNama('');
    setFormSlug('');
    setFormDeskripsi('');
    setFormStatus('draft');
    setFormTanggalBuka('');
    setFormTanggalTutup('');
    setFormLinkDriveTemplate('');
    setIsModalOpen(true);
  }

  function openEditModal(program: ProgramItem) {
    setEditingProgram(program);
    setFormNama(program.nama);
    setFormSlug(program.slug);
    setFormDeskripsi(program.deskripsi || '');
    setFormStatus(program.status);
    setFormTanggalBuka(
      program.tanggalBuka ? new Date(program.tanggalBuka).toISOString().slice(0, 10) : ''
    );
    setFormTanggalTutup(
      program.tanggalTutup ? new Date(program.tanggalTutup).toISOString().slice(0, 10) : ''
    );
    setFormLinkDriveTemplate(program.linkDriveTemplate || '');
    setIsModalOpen(true);
  }

  async function handleSaveProgram(e: React.FormEvent) {
    e.preventDefault();
    if (!formNama.trim()) {
      setToast({ message: 'Nama program wajib diisi.', type: 'error' });
      return;
    }

    setFormSubmitting(true);
    try {
      if (editingProgram) {
        const res = await updateProgramBantuan(editingProgram.id, {
          nama: formNama,
          slug: formSlug,
          deskripsi: formDeskripsi,
          status: formStatus,
          tanggalBuka: formTanggalBuka || null,
          tanggalTutup: formTanggalTutup || null,
          linkDriveTemplate: formLinkDriveTemplate,
        });

        if (res.success) {
          setToast({ message: 'Program bantuan berhasil diperbarui.', type: 'success' });
          setIsModalOpen(false);
          router.refresh();
        } else {
          setToast({ message: res.error || 'Gagal mengupdate program.', type: 'error' });
        }
      } else {
        const res = await createProgramBantuan({
          nama: formNama,
          slug: formSlug,
          deskripsi: formDeskripsi,
          status: formStatus,
          tanggalBuka: formTanggalBuka || null,
          tanggalTutup: formTanggalTutup || null,
          linkDriveTemplate: formLinkDriveTemplate,
        });

        if (res.success) {
          setToast({ message: 'Program bantuan baru berhasil dibuat.', type: 'success' });
          setIsModalOpen(false);
          router.refresh();
        } else {
          setToast({ message: res.error || 'Gagal membuat program.', type: 'error' });
        }
      }
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteConfirm() {
    if (!deletingId) return;
    setDeleteLoading(true);
    try {
      const res = await deleteProgramBantuan(deletingId);
      if (res.success) {
        setToast({ message: 'Program bantuan berhasil dihapus.', type: 'success' });
        setDeletingId(null);
        router.refresh();
      } else {
        setToast({ message: res.error || 'Gagal menghapus program.', type: 'error' });
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  async function handleToggleStatus(id: string, currentStatus: string) {
    const nextStatus = currentStatus === 'dibuka' ? 'ditutup' : 'dibuka';
    startTransition(async () => {
      const res = await toggleProgramStatus(id, nextStatus as any);
      if (res.success) {
        setToast({
          message: `Status program diubah menjadi "${nextStatus}".`,
          type: 'success',
        });
        router.refresh();
      } else {
        setToast({ message: res.error || 'Gagal mengubah status.', type: 'error' });
      }
    });
  }

  async function handleTriggerWorker() {
    setWorkerLoading(true);
    try {
      const res = await triggerWorkerManual();
      if (res.success) {
        setToast({
          message: res.data?.message || 'Antrean worker berhasil diproses.',
          type: 'success',
        });
        router.refresh();
      } else {
        setToast({ message: res.error || 'Gagal memicu worker antrean.', type: 'error' });
      }
    } finally {
      setWorkerLoading(false);
    }
  }

  function formatTgl(d: Date | string | null) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Notifikasi */}
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Alert Error jika query gagal */}
      {errorMessage && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-3 shadow-xs">
          <FontAwesomeIcon icon={faExclamationTriangle} className="text-red-500 text-base shrink-0" />
          <div>
            <p className="font-bold">Gagal memuat data dari database Neon:</p>
            <p className="text-red-600 mt-0.5">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Page Header (Sesuai Gaya Header /admin/program) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#000]">Pendaftaran Program</h1>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-lg border border-emerald-200 uppercase">
              Neon DB
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Kelola beasiswa & bantuan, konfigurasi syarat berkas, biodata dinamis, dan seleksi pendaftar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {totalBuka} Dibuka
          </span>
          <span className="px-3 py-1.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-200">
            {totalTutup} Ditutup
          </span>
          <span className="px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-bold rounded-xl border border-gray-200">
            {totalDraft} Draft
          </span>
        </div>
      </div>

      {/* Main Unified Box (Sesuai Gaya Wadah Utama /admin/program) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Search, Filter Status & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 flex-1 max-w-lg">
            {/* Search Input */}
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Cari program bantuan…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-[#005621] bg-gray-50/60 placeholder-gray-400"
              />
            </div>

            {/* Filter Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 focus:outline-none focus:border-[#005621] bg-gray-50/60 cursor-pointer shrink-0"
            >
              <option value="all">Semua Status</option>
              <option value="dibuka">Dibuka</option>
              <option value="ditutup">Ditutup</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Manual Trigger Worker Antrean */}
            <button
              type="button"
              onClick={handleTriggerWorker}
              disabled={workerLoading}
              className="px-3.5 py-2.5 rounded-xl border border-amber-300 text-amber-900 font-bold text-xs bg-amber-50 hover:bg-amber-100 transition-colors shadow-2xs cursor-pointer flex items-center gap-1.5 disabled:opacity-50 whitespace-nowrap"
              title="Picu pemrosesan antrean verifikasi pendaftar manual"
            >
              <FontAwesomeIcon
                icon={workerLoading ? faSpinner : faPlay}
                className={workerLoading ? 'animate-spin text-amber-700' : 'text-amber-700'}
              />
              <span>{workerLoading ? 'Memproses…' : 'Proses Antrean'}</span>
            </button>

            {/* Tombol Tambah Program */}
            <button
              type="button"
              onClick={openAddModal}
              className="flex items-center gap-2 bg-[#005621] hover:bg-[#004219] text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Program
            </button>
          </div>
        </div>

        {/* Card Grid Content */}
        <div className="p-5">
          {filteredPrograms.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="flex flex-col items-center gap-2">
                <svg className="w-10 h-10 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <p className="text-sm font-semibold">{search ? 'Tidak ada yang cocok' : 'Belum ada program pendaftaran'}</p>
                {!search && (
                  <button
                    type="button"
                    onClick={openAddModal}
                    className="mt-2 px-4 py-2 rounded-xl font-bold text-xs bg-[#005621] text-white hover:bg-[#004219] transition-all cursor-pointer shadow-sm"
                  >
                    Tambah Program Pertama
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredPrograms.map((prog) => (
                <div
                  key={prog.id}
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >
                  {/* Top Cover Visual (Mengikuti gaya cover di /admin/program) */}
                  <div className="relative h-32 bg-gradient-to-br from-[#005621]/10 via-[#005621]/5 to-[#f5b016]/10 shrink-0 border-b border-gray-100 overflow-hidden">
                    <ProgramCardCover gambarUrl={prog.gambarUrl} nama={prog.nama} />

                    {/* Badge Slug / Kategori Top Left */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1">
                      <span className="px-2 py-0.5 bg-white/90 backdrop-blur-xs text-emerald-800 text-[10px] font-extrabold rounded-full border border-emerald-200/80 uppercase shadow-2xs">
                        {prog.slug}
                      </span>
                    </div>

                    {/* Status Pill Toggle Top Right */}
                    <div className="absolute top-2.5 right-2.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(prog.id, prog.status)}
                        disabled={isPending}
                        title="Klik untuk ubah status pendaftaran"
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-colors cursor-pointer shadow-xs ${
                          prog.status === 'dibuka'
                            ? 'bg-green-100 text-green-700 hover:bg-green-200 border border-green-200'
                            : prog.status === 'ditutup'
                            ? 'bg-red-100 text-red-700 hover:bg-red-200 border border-red-200'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200'
                        }`}
                      >
                        {prog.status === 'dibuka' ? 'Dibuka' : prog.status === 'ditutup' ? 'Ditutup' : 'Draft'}
                      </button>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-4 flex flex-col flex-1 gap-2.5">
                    {/* Title */}
                    <h3 className="font-bold text-gray-800 text-sm leading-snug line-clamp-2" title={prog.nama}>
                      {prog.nama}
                    </h3>

                    {/* Description */}
                    <p className="text-[11px] text-gray-500 line-clamp-2 leading-relaxed">
                      {prog.deskripsi || 'Tidak ada deskripsi singkat.'}
                    </p>

                    {/* Jadwal Buka - Tutup */}
                    <div className="p-2.5 bg-gray-50/80 rounded-xl text-[11px] space-y-1 text-gray-600 border border-gray-100">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-gray-400">
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-2xs" />
                          Buka:
                        </span>
                        <span className="font-bold text-gray-700">{formatTgl(prog.tanggalBuka)}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 font-medium text-gray-400">
                          <FontAwesomeIcon icon={faCalendarAlt} className="text-gray-400 text-2xs" />
                          Tutup:
                        </span>
                        <span className="font-bold text-gray-700">{formatTgl(prog.tanggalTutup)}</span>
                      </div>
                    </div>

                    {/* Statistik: Dokumen, Biodata, Pendaftar */}
                    <div className="grid grid-cols-3 gap-1.5 text-center">
                      <div className="p-1.5 rounded-lg bg-blue-50/70 border border-blue-100/60">
                        <p className="text-[10px] font-bold text-blue-600">Dokumen</p>
                        <p className="text-xs font-black text-blue-900">{prog._count?.documentFields ?? 0}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-purple-50/70 border border-purple-100/60">
                        <p className="text-[10px] font-bold text-purple-600">Biodata</p>
                        <p className="text-xs font-black text-purple-900">{prog._count?.biodataFields ?? 0}</p>
                      </div>
                      <div className="p-1.5 rounded-lg bg-emerald-50/70 border border-emerald-100/60">
                        <p className="text-[10px] font-bold text-emerald-600">Pendaftar</p>
                        <p className="text-xs font-black text-emerald-900">{prog._count?.submissions ?? 0}</p>
                      </div>
                    </div>

                    {/* Link Drive Template */}
                    {prog.linkDriveTemplate && (
                      <a
                        href={prog.linkDriveTemplate}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] text-blue-600 hover:text-blue-800 flex items-center gap-1 font-semibold truncate pt-0.5"
                      >
                        <FontAwesomeIcon icon={faFolderOpen} className="shrink-0 text-xs" />
                        <span className="truncate">Google Drive Template</span>
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="shrink-0 text-[8px]" />
                      </a>
                    )}

                    {/* Actions: Edit, Delete, Kelola & Seleksi */}
                    <div className="flex items-center justify-between gap-1.5 pt-3 mt-auto border-t border-gray-100">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(prog)}
                          title="Edit Info Program"
                          className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingId(prog.id)}
                          title="Hapus Program"
                          className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Tombol Kelola & Seleksi */}
                      <Link
                        href={`/admin/pendaftaran/${prog.id}`}
                        className="px-3 py-1.5 rounded-lg bg-[#005621] hover:bg-[#004219] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                      >
                        <span>Kelola & Seleksi</span>
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Container Footer */}
        {initialPrograms.length > 0 && (
          <div className="px-5 py-4 border-t border-gray-100 bg-gray-50/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500 font-medium">
              Menampilkan <span className="font-bold text-gray-700">{filteredPrograms.length}</span> dari <span className="font-bold text-gray-700">{initialPrograms.length}</span> program pendaftaran
            </p>
          </div>
        )}
      </div>

      {/* Modal Tambah / Edit Program */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto transform transition-all animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-lg font-black text-gray-900">
                {editingProgram ? 'Edit Program Bantuan' : 'Tambah Program Bantuan Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama Program <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: BPRA-UKT Semester Ganjil 2026"
                  value={formNama}
                  onChange={(e) => setFormNama(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Slug URL (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Kosongkan untuk auto-generate dari nama"
                  value={formSlug}
                  onChange={(e) => setFormSlug(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Status Pendaftaran
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[#005621]"
                >
                  <option value="draft">Draft (Belum Ditampilkan)</option>
                  <option value="dibuka">Dibuka</option>
                  <option value="ditutup">Ditutup</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tanggal Buka
                  </label>
                  <input
                    type="date"
                    value={formTanggalBuka}
                    onChange={(e) => setFormTanggalBuka(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tanggal Tutup
                  </label>
                  <input
                    type="date"
                    value={formTanggalTutup}
                    onChange={(e) => setFormTanggalTutup(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Link Google Drive Template Dokumen
                </label>
                <input
                  type="url"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={formLinkDriveTemplate}
                  onChange={(e) => setFormLinkDriveTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
                <p className="text-3xs text-gray-400 mt-1">
                  Pendaftar dapat mengunduh format surat rekomendasi, format surat pernyataan, dsb.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Deskripsi / Keterangan Program
                </label>
                <textarea
                  rows={3}
                  placeholder="Penjelasan ringkas mengenai sasaran program, kriteria penerima, dsb."
                  value={formDeskripsi}
                  onChange={(e) => setFormDeskripsi(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#005621] text-white font-bold text-xs hover:bg-[#004219] transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {formSubmitting && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                  <span>{editingProgram ? 'Simpan Perubahan' : 'Buat Program'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus */}
      <ConfirmModal
        isOpen={Boolean(deletingId)}
        onClose={() => setDeletingId(null)}
        onConfirm={handleDeleteConfirm}
        title="Hapus Program Bantuan?"
        message="Menghapus program ini akan sekaligus menghapus konfigurasi syarat dokumen, biodata, dan seluruh data pendaftar terkait. Tindakan ini tidak dapat dibatalkan."
        confirmText="Ya, Hapus Program"
        loading={deleteLoading}
        type="danger"
      />
    </div>
  );
}
