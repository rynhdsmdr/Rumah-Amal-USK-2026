'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faArrowLeft,
  faFileAlt,
  faUserTag,
  faUsers,
  faGear,
  faPlus,
  faEdit,
  faTrashAlt,
  faCheckCircle,
  faTimesCircle,
  faExclamationTriangle,
  faSpinner,
  faExternalLinkAlt,
  faFolderOpen,
  faCalendarAlt,
  faSearch,
  faFilePdf,
  faStamp,
  faEye,
  faClock,
  faCheckSquare,
  faSquare,
  faDownload,
  faFileExcel,
  faListUl,
  faGraduationCap,
  faMoneyBillWave,
} from '@fortawesome/free-solid-svg-icons';
import {
  updateProgramBantuan,
  toggleProgramStatus,
  addDocumentField,
  updateDocumentField,
  deleteDocumentField,
  addBiodataField,
  updateBiodataField,
  deleteBiodataField,
  updateSubmissionStatus,
  updateMultipleSubmissionsStatus,
} from '@/actions/pendaftaran-admin';
import ConfirmModal from '@/components/admin/ConfirmModal';
import AdminToast, { ToastState } from '@/components/admin/AdminToast';

interface DocumentFieldItem {
  id: string;
  programId: string;
  key: string;
  label: string;
  required: boolean;
  maxAgeMonths: number | null;
  expectedKeywords: string[];
  nameCheckApplicable: boolean;
  isSingleCombinedUpload: boolean;
  needsStampCheck: boolean;
  order: number;
}

interface BiodataFieldItem {
  id: string;
  programId: string;
  key: string;
  label: string;
  tipe: string;
  options: string[];
  required: boolean;
  order: number;
}

interface SubmissionItem {
  id: string;
  programId: string;
  token: string;
  biodataValues: any;
  status: string;
  warnings: any;
  linkDokumenGabungan: string | null;
  submittedAt: Date | string;
  documents: {
    id: string;
    fieldKey: string;
    originalFilename: string;
    fileUrl: string;
    needsRevision: boolean;
    revisionNote: string | null;
  }[];
}

interface ProgramDetailProps {
  program: {
    id: string;
    nama: string;
    slug: string;
    deskripsi: string | null;
    gambarUrl: string | null;
    status: string;
    tanggalBuka: Date | string | null;
    tanggalTutup: Date | string | null;
    linkDriveTemplate: string | null;
    documentFields: DocumentFieldItem[];
    biodataFields: BiodataFieldItem[];
  };
  initialSubmissions: SubmissionItem[];
  submissionMeta: {
    total: number;
    page: number;
    totalPages: number;
    statusCounts: Record<string, number>;
  };
  initialStatus: string;
}

export default function ProgramDetailClient({
  program,
  initialSubmissions,
  submissionMeta,
  initialStatus,
}: ProgramDetailProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Active Tab
  const [activeTab, setActiveTab] = useState<'dokumen' | 'biodata' | 'pendaftar' | 'pengaturan'>('dokumen');

  // Toasts
  const [toast, setToast] = useState<ToastState | null>(null);

  // Filter Submissions
  const [subStatusFilter, setSubStatusFilter] = useState(initialStatus);

  // Sub-tabs & Selection Mode
  const [selectionViewMode, setSelectionViewMode] = useState<'layak' | 'bermasalah' | 'semua'>('layak');
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [candidateStatusFilter, setCandidateStatusFilter] = useState<'all' | 'belum_diseleksi' | 'lolos' | 'tidak_lolos'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterFakultas, setFilterFakultas] = useState('all');
  const [sortBy, setSortBy] = useState<'default' | 'ipk_desc' | 'penghasilan_asc' | 'nama_asc'>('default');

  // ==========================================
  // STATE: DOCUMENT FIELD MODAL
  // ==========================================
  const [isDocModalOpen, setIsDocModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentFieldItem | null>(null);
  const [docKey, setDocKey] = useState('');
  const [docLabel, setDocLabel] = useState('');
  const [docRequired, setDocRequired] = useState(true);
  const [docMaxAgeMonths, setDocMaxAgeMonths] = useState<string>('');
  const [docKeywordsStr, setDocKeywordsStr] = useState('');
  const [docNameCheck, setDocNameCheck] = useState(false);
  const [docSingleCombined, setDocSingleCombined] = useState(false);
  const [docNeedsStamp, setDocNeedsStamp] = useState(false);
  const [docSubmitting, setDocSubmitting] = useState(false);

  // ==========================================
  // STATE: BIODATA FIELD MODAL
  // ==========================================
  const [isBioModalOpen, setIsBioModalOpen] = useState(false);
  const [editingBio, setEditingBio] = useState<BiodataFieldItem | null>(null);
  const [bioKey, setBioKey] = useState('');
  const [bioLabel, setBioLabel] = useState('');
  const [bioTipe, setBioTipe] = useState('text');
  const [bioOptionsStr, setBioOptionsStr] = useState('');
  const [bioRequired, setBioRequired] = useState(true);
  const [bioSubmitting, setBioSubmitting] = useState(false);

  // ==========================================
  // STATE: PENGATURAN PROGRAM FORM
  // ==========================================
  const [progNama, setProgNama] = useState(program.nama);
  const [progSlug, setProgSlug] = useState(program.slug);
  const [progStatus, setProgStatus] = useState(program.status);
  const [progDeskripsi, setProgDeskripsi] = useState(program.deskripsi || '');
  const [progTanggalBuka, setProgTanggalBuka] = useState(
    program.tanggalBuka ? new Date(program.tanggalBuka).toISOString().slice(0, 10) : ''
  );
  const [progTanggalTutup, setProgTanggalTutup] = useState(
    program.tanggalTutup ? new Date(program.tanggalTutup).toISOString().slice(0, 10) : ''
  );
  const [progLinkDriveTemplate, setProgLinkDriveTemplate] = useState(program.linkDriveTemplate || '');
  const [progSubmitting, setProgSubmitting] = useState(false);

  // ==========================================
  // STATE: SUBMISSION DETAIL MODAL
  // ==========================================
  const [viewingSub, setViewingSub] = useState<SubmissionItem | null>(null);

  // ==========================================
  // STATE: DELETE CONFIRMATION
  // ==========================================
  const [deleteTarget, setDeleteTarget] = useState<{
    type: 'doc' | 'bio';
    id: string;
    label: string;
  } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ----------------------------------------------------
  // HANDLERS: DOCUMENT FIELD
  // ----------------------------------------------------
  function openAddDocModal() {
    setEditingDoc(null);
    setDocKey('');
    setDocLabel('');
    setDocRequired(true);
    setDocMaxAgeMonths('');
    setDocKeywordsStr('');
    setDocNameCheck(false);
    setDocSingleCombined(false);
    setDocNeedsStamp(false);
    setIsDocModalOpen(true);
  }

  function openEditDocModal(doc: DocumentFieldItem) {
    setEditingDoc(doc);
    setDocKey(doc.key);
    setDocLabel(doc.label);
    setDocRequired(doc.required);
    setDocMaxAgeMonths(doc.maxAgeMonths ? String(doc.maxAgeMonths) : '');
    setDocKeywordsStr(doc.expectedKeywords?.join(', ') || '');
    setDocNameCheck(doc.nameCheckApplicable);
    setDocSingleCombined(doc.isSingleCombinedUpload);
    setDocNeedsStamp(doc.needsStampCheck);
    setIsDocModalOpen(true);
  }

  async function handleSaveDoc(e: React.FormEvent) {
    e.preventDefault();
    if (!docLabel.trim()) {
      setToast({ message: 'Label dokumen wajib diisi.', type: 'error' });
      return;
    }

    setDocSubmitting(true);
    const keywords = docKeywordsStr
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    try {
      if (editingDoc) {
        const res = await updateDocumentField(editingDoc.id, {
          key: docKey || undefined,
          label: docLabel,
          required: docRequired,
          maxAgeMonths: docMaxAgeMonths ? parseInt(docMaxAgeMonths, 10) : null,
          expectedKeywords: keywords,
          nameCheckApplicable: docNameCheck,
          isSingleCombinedUpload: docSingleCombined,
          needsStampCheck: docNeedsStamp,
        });

        if (res.success) {
          setToast({ message: 'Syarat dokumen berhasil diperbarui.', type: 'success' });
          setIsDocModalOpen(false);
          router.refresh();
        } else {
          setToast({ message: res.error || 'Gagal menyimpan syarat dokumen.', type: 'error' });
        }
      } else {
        const res = await addDocumentField(program.id, {
          key: docKey,
          label: docLabel,
          required: docRequired,
          maxAgeMonths: docMaxAgeMonths ? parseInt(docMaxAgeMonths, 10) : null,
          expectedKeywords: keywords,
          nameCheckApplicable: docNameCheck,
          isSingleCombinedUpload: docSingleCombined,
          needsStampCheck: docNeedsStamp,
        });

        if (res.success) {
          setToast({ message: 'Syarat dokumen baru berhasil ditambahkan.', type: 'success' });
          setIsDocModalOpen(false);
          router.refresh();
        } else {
          setToast({ message: res.error || 'Gagal menambahkan syarat dokumen.', type: 'error' });
        }
      }
    } finally {
      setDocSubmitting(false);
    }
  }

  // ----------------------------------------------------
  // HANDLERS: BIODATA FIELD
  // ----------------------------------------------------
  function openAddBioModal() {
    setEditingBio(null);
    setBioKey('');
    setBioLabel('');
    setBioTipe('text');
    setBioOptionsStr('');
    setBioRequired(true);
    setIsBioModalOpen(true);
  }

  function openEditBioModal(bio: BiodataFieldItem) {
    setEditingBio(bio);
    setBioKey(bio.key);
    setBioLabel(bio.label);
    setBioTipe(bio.tipe);
    setBioOptionsStr(bio.options?.join('\n') || '');
    setBioRequired(bio.required);
    setIsBioModalOpen(true);
  }

  async function handleSaveBio(e: React.FormEvent) {
    e.preventDefault();
    if (!bioLabel.trim()) {
      setToast({ message: 'Label biodata wajib diisi.', type: 'error' });
      return;
    }

    setBioSubmitting(true);
    const options = bioOptionsStr
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean);

    try {
      if (editingBio) {
        const res = await updateBiodataField(editingBio.id, {
          key: bioKey || undefined,
          label: bioLabel,
          tipe: bioTipe,
          options,
          required: bioRequired,
        });

        if (res.success) {
          setToast({ message: 'Field biodata berhasil diperbarui.', type: 'success' });
          setIsBioModalOpen(false);
          router.refresh();
        } else {
          setToast({ message: res.error || 'Gagal menyimpan field biodata.', type: 'error' });
        }
      } else {
        const res = await addBiodataField(program.id, {
          key: bioKey,
          label: bioLabel,
          tipe: bioTipe,
          options,
          required: bioRequired,
        });

        if (res.success) {
          setToast({ message: 'Field biodata baru berhasil ditambahkan.', type: 'success' });
          setIsBioModalOpen(false);
          router.refresh();
        } else {
          setToast({ message: res.error || 'Gagal menambahkan field biodata.', type: 'error' });
        }
      }
    } finally {
      setBioSubmitting(false);
    }
  }

  // ----------------------------------------------------
  // HANDLERS: DELETE FIELD
  // ----------------------------------------------------
  async function handleDeleteFieldConfirm() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      if (deleteTarget.type === 'doc') {
        const res = await deleteDocumentField(deleteTarget.id);
        if (res.success) {
          setToast({ message: 'Syarat dokumen berhasil dihapus.', type: 'success' });
          setDeleteTarget(null);
          router.refresh();
        } else {
          setToast({ message: res.error || 'Gagal menghapus dokumen.', type: 'error' });
        }
      } else {
        const res = await deleteBiodataField(deleteTarget.id);
        if (res.success) {
          setToast({ message: 'Field biodata berhasil dihapus.', type: 'success' });
          setDeleteTarget(null);
          router.refresh();
        } else {
          setToast({ message: res.error || 'Gagal menghapus biodata.', type: 'error' });
        }
      }
    } finally {
      setDeleteLoading(false);
    }
  }

  // ----------------------------------------------------
  // HANDLERS: PENGATURAN PROGRAM
  // ----------------------------------------------------
  async function handleSaveProgramSettings(e: React.FormEvent) {
    e.preventDefault();
    setProgSubmitting(true);
    try {
      const res = await updateProgramBantuan(program.id, {
        nama: progNama,
        slug: progSlug,
        status: progStatus,
        deskripsi: progDeskripsi,
        tanggalBuka: progTanggalBuka || null,
        tanggalTutup: progTanggalTutup || null,
        linkDriveTemplate: progLinkDriveTemplate,
      });

      if (res.success) {
        setToast({ message: 'Pengaturan program berhasil disimpan.', type: 'success' });
        router.refresh();
      } else {
        setToast({ message: res.error || 'Gagal menyimpan pengaturan.', type: 'error' });
      }
    } finally {
      setProgSubmitting(false);
    }
  }

  // ----------------------------------------------------
  // HANDLERS: SUBMISSION STATUS
  // ----------------------------------------------------
  async function handleChangeSubmissionStatus(submissionId: string, newStatus: string) {
    startTransition(async () => {
      const res = await updateSubmissionStatus(submissionId, newStatus);
      if (res.success) {
        setToast({ message: `Status pendaftar diubah menjadi "${newStatus.replace(/_/g, ' ')}".`, type: 'success' });
        setViewingSub((prev) => (prev && prev.id === submissionId ? { ...prev, status: newStatus } : prev));
        router.refresh();
      } else {
        setToast({ message: res.error || 'Gagal mengubah status.', type: 'error' });
      }
    });
  }

  async function handleBulkSetStatus(newStatus: string) {
    if (selectedSubIds.length === 0) return;
    setBulkUpdating(true);
    try {
      const res = await updateMultipleSubmissionsStatus(selectedSubIds, newStatus, program.id);
      if (res.success) {
        setToast({
          message: `Berhasil mengubah status ${res.count} pendaftar menjadi "${newStatus.replace(/_/g, ' ')}".`,
          type: 'success',
        });
        setSelectedSubIds([]);
        router.refresh();
      } else {
        setToast({ message: res.error || 'Gagal mengubah status pendaftar.', type: 'error' });
      }
    } catch (err: any) {
      setToast({ message: err.message || 'Terjadi kesalahan saat memproses data.', type: 'error' });
    } finally {
      setBulkUpdating(false);
    }
  }

  function toggleSelectAll(candidateList: SubmissionItem[]) {
    const candidateIds = candidateList.map((c) => c.id);
    const allSelected = candidateIds.length > 0 && candidateIds.every((id) => selectedSubIds.includes(id));
    if (allSelected) {
      setSelectedSubIds((prev) => prev.filter((id) => !candidateIds.includes(id)));
    } else {
      setSelectedSubIds((prev) => Array.from(new Set([...prev, ...candidateIds])));
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedSubIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  }

  function getBiodataValue(vals: Record<string, any> | null | undefined, candidateKeys: string[]): string {
    if (!vals) return '-';
    for (const k of candidateKeys) {
      if (vals[k] !== undefined && vals[k] !== null && String(vals[k]).trim() !== '') {
        return String(vals[k]);
      }
    }
    const lowerKeys = Object.keys(vals);
    for (const target of candidateKeys) {
      const found = lowerKeys.find((k) => k.toLowerCase() === target.toLowerCase());
      if (found && vals[found] !== undefined && vals[found] !== null && String(vals[found]).trim() !== '') {
        return String(vals[found]);
      }
    }
    return '-';
  }

  function parseNumericVal(val: string): number {
    if (!val || val === '-') return 0;
    const clean = val.replace(/Rp|\s/gi, '').replace(/\./g, '').replace(',', '.');
    const num = parseFloat(clean);
    return isNaN(num) ? 0 : num;
  }

  function handleExportCsv(targetList: SubmissionItem[], viewTitle: string) {
    const headers = [
      'Token',
      'Tanggal Daftar',
      'Nama Lengkap',
      'NPM / Identitas',
      'No HP / Kontak',
      'Fakultas',
      'Program Studi',
      'IPK',
      'Penghasilan Ortu / UKT',
      'Status Berkas',
      'Catatan Warning',
      'Status Seleksi',
      'Link PDF Gabungan',
    ];

    const rows = targetList.map((sub) => {
      const vals = sub.biodataValues || {};
      const nama = vals.nama || vals.nama_lengkap || vals.nama_pengusul || '-';
      const kontak = vals.no_hp || vals.no_wa || vals.whatsapp || vals.email || '-';
      const idNum = vals.npm || vals.nik || vals.nim || '-';
      const fak = getBiodataValue(vals, ['fakultas', 'fakultas_asal']);
      const prodi = getBiodataValue(vals, ['prodi', 'program_studi', 'jurusan']);
      const ipk = getBiodataValue(vals, ['ipk', 'ip_semester', 'indeks_prestasi']);
      const penghasilan = getBiodataValue(vals, ['penghasilan_orang_tua', 'penghasilan_ayah', 'ukt', 'biaya_ukt']);
      const warningsList = Array.isArray(sub.warnings) ? sub.warnings : [];
      const statusBerkas =
        sub.status === 'lolos'
          ? 'Terverifikasi Lolos'
          : warningsList.length > 0
          ? 'Ada Catatan Berkas'
          : 'Sesuai';
      const warningNotes = warningsList
        .map((w: any) => `${w.fileLabel || w.fieldKey}: ${w.reason || w.message}`)
        .join('; ');

      return [
        sub.token,
        formatTgl(sub.submittedAt),
        `"${String(nama).replace(/"/g, '""')}"`,
        `"${String(idNum).replace(/"/g, '""')}"`,
        `"${String(kontak).replace(/"/g, '""')}"`,
        `"${String(fak).replace(/"/g, '""')}"`,
        `"${String(prodi).replace(/"/g, '""')}"`,
        `"${String(ipk).replace(/"/g, '""')}"`,
        `"${String(penghasilan).replace(/"/g, '""')}"`,
        `"${statusBerkas}"`,
        `"${warningNotes.replace(/"/g, '""')}"`,
        `"${sub.status}"`,
        `"${sub.linkDokumenGabungan || ''}"`,
      ];
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `rekap_${viewTitle.toLowerCase().replace(/\s+/g, '_')}_${program.slug}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleFilterStatus(status: string) {
    setSubStatusFilter(status);
    router.push(`/admin/pendaftaran/${program.id}?status=${status}`);
  }

  function formatTgl(d: Date | string | null) {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // ----------------------------------------------------
  // CANDIDATE POOLS & FILTERING
  // ----------------------------------------------------
  const isSubmissionProcessing = (sub: SubmissionItem) =>
    ['menunggu_diproses', 'sedang_diproses'].includes(sub.status);
  const isSubmissionFailed = (sub: SubmissionItem) => sub.status === 'gagal_diproses';
  const getSubWarnings = (sub: SubmissionItem) => (Array.isArray(sub.warnings) ? sub.warnings : []);

  const isSubmissionLayak = (sub: SubmissionItem) => {
    if (isSubmissionProcessing(sub) || isSubmissionFailed(sub)) return false;
    const w = getSubWarnings(sub);
    return w.length === 0 || sub.status === 'lolos';
  };

  const isSubmissionBermasalah = (sub: SubmissionItem) => {
    if (sub.status === 'lolos') return false;
    const w = getSubWarnings(sub);
    return w.length > 0 || isSubmissionFailed(sub);
  };

  const poolLayakAll = initialSubmissions.filter(isSubmissionLayak);
  const poolBermasalahAll = initialSubmissions.filter(isSubmissionBermasalah);

  const availableFakultas = Array.from(
    new Set(
      initialSubmissions
        .map((s) => getBiodataValue(s.biodataValues, ['fakultas', 'fakultas_asal']))
        .filter((f) => f && f !== '-')
    )
  ).sort();

  const displayedPoolLayak = poolLayakAll
    .filter((sub) => {
      if (candidateStatusFilter !== 'all' && sub.status !== candidateStatusFilter) {
        return false;
      }
      if (filterFakultas !== 'all') {
        const fak = getBiodataValue(sub.biodataValues, ['fakultas', 'fakultas_asal']);
        if (fak !== filterFakultas) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const vals = sub.biodataValues || {};
        const nama = (vals.nama || vals.nama_lengkap || vals.nama_pengusul || '').toLowerCase();
        const idNum = (vals.npm || vals.nik || vals.nim || '').toLowerCase();
        const token = sub.token.toLowerCase();
        if (!nama.includes(q) && !idNum.includes(q) && !token.includes(q)) {
          return false;
        }
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'ipk_desc') {
        const valA = parseNumericVal(getBiodataValue(a.biodataValues, ['ipk', 'ip_semester', 'indeks_prestasi']));
        const valB = parseNumericVal(getBiodataValue(b.biodataValues, ['ipk', 'ip_semester', 'indeks_prestasi']));
        return valB - valA;
      }
      if (sortBy === 'penghasilan_asc') {
        const valA = parseNumericVal(getBiodataValue(a.biodataValues, ['penghasilan_orang_tua', 'penghasilan_ayah', 'ukt', 'biaya_ukt']));
        const valB = parseNumericVal(getBiodataValue(b.biodataValues, ['penghasilan_orang_tua', 'penghasilan_ayah', 'ukt', 'biaya_ukt']));
        return valA - valB;
      }
      if (sortBy === 'nama_asc') {
        const valA = (a.biodataValues?.nama || a.biodataValues?.nama_lengkap || '').toLowerCase();
        const valB = (b.biodataValues?.nama || b.biodataValues?.nama_lengkap || '').toLowerCase();
        return valA.localeCompare(valB);
      }
      return 0;
    });

  const displayedPoolBermasalah = poolBermasalahAll.filter((sub) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const vals = sub.biodataValues || {};
      const nama = (vals.nama || vals.nama_lengkap || vals.nama_pengusul || '').toLowerCase();
      const idNum = (vals.npm || vals.nik || vals.nim || '').toLowerCase();
      const token = sub.token.toLowerCase();
      if (!nama.includes(q) && !idNum.includes(q) && !token.includes(q)) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fadeIn">
      <AdminToast toast={toast} onClose={() => setToast(null)} />

      {/* Top Bar: Back button & Program Header */}
      <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/admin/pendaftaran"
              className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center justify-center text-xs transition-colors cursor-pointer"
              title="Kembali ke Daftar Program"
            >
              <FontAwesomeIcon icon={faArrowLeft} />
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black text-gray-900 leading-tight">
                  {program.nama}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-lg border text-3xs font-extrabold uppercase tracking-wider ${
                    program.status === 'dibuka'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : program.status === 'ditutup'
                      ? 'bg-red-50 text-red-700 border-red-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  }`}
                >
                  {program.status}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-medium flex items-center gap-3">
                <span>Slug: <code className="text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded-md font-mono">{program.slug}</code></span>
                {program.linkDriveTemplate && (
                  <a
                    href={program.linkDriveTemplate}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold"
                  >
                    <FontAwesomeIcon icon={faFolderOpen} />
                    <span>Drive Template</span>
                  </a>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/pendaftaran/${program.slug}`}
              target="_blank"
              className="px-3.5 py-2 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 font-bold text-xs shadow-2xs inline-flex items-center gap-2"
            >
              <span>Lihat Form Publik</span>
              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs text-gray-400" />
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-gray-100 pt-4 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dokumen')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${
              activeTab === 'dokumen'
                ? 'bg-[#005621] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FontAwesomeIcon icon={faFileAlt} />
            <span>Syarat Dokumen ({program.documentFields.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('biodata')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${
              activeTab === 'biodata'
                ? 'bg-[#005621] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FontAwesomeIcon icon={faUserTag} />
            <span>Syarat Biodata ({program.biodataFields.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pendaftar')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${
              activeTab === 'pendaftar'
                ? 'bg-[#005621] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FontAwesomeIcon icon={faUsers} />
            <span>Data Pendaftar & Seleksi ({submissionMeta.total})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pengaturan')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 ${
              activeTab === 'pengaturan'
                ? 'bg-[#005621] text-white shadow-xs'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <FontAwesomeIcon icon={faGear} />
            <span>Pengaturan Program</span>
          </button>
        </div>
      </div>

      {/* ================================================================= */}
      {/* TAB 1: SYARAT DOKUMEN BUILDER                                    */}
      {/* ================================================================= */}
      {activeTab === 'dokumen' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div>
              <h2 className="text-base font-black text-gray-900">Builder Syarat Dokumen</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Konfigurasi berkas yang harus diunggah pendaftar beserta aturan verifikasi otomatis (OCR, usia surat, nama, stempel)
              </p>
            </div>
            <button
              type="button"
              onClick={openAddDocModal}
              className="px-4 py-2 rounded-xl bg-[#005621] hover:bg-[#004219] text-white font-bold text-xs transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Tambah Syarat Dokumen</span>
            </button>
          </div>

          {program.documentFields.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
              <p className="text-sm font-bold text-gray-800">Belum ada syarat dokumen yang ditambahkan.</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Program ini belum mensyaratkan upload berkas apa pun. Klik tombol di atas untuk menambahkan berkas seperti KTP, KTM, surat permohonan, dsb.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {program.documentFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-200 transition-all"
                >
                  <div className="space-y-2 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 font-black text-2xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-black text-gray-900 truncate">{field.label}</h3>
                      <span className="text-3xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-semibold">
                        key: {field.key}
                      </span>
                      <span
                        className={`text-3xs font-bold px-2 py-0.5 rounded-md border ${
                          field.required
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {field.required ? 'Wajib' : 'Opsional'}
                      </span>
                    </div>

                    {/* Flags Indicators */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {field.maxAgeMonths && (
                        <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-3xs font-semibold">
                          Maks Usia: {field.maxAgeMonths} Bulan
                        </span>
                      )}

                      {field.nameCheckApplicable && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-3xs font-semibold">
                          Cek Nama Pendaftar (Fuzzy Levenshtein)
                        </span>
                      )}

                      {field.isSingleCombinedUpload && (
                        <span className="px-2 py-0.5 rounded-md bg-purple-50 text-purple-800 border border-purple-200 text-3xs font-semibold">
                          Upload Foto Gabungan Mandiri (Format Tata Letak)
                        </span>
                      )}

                      {field.needsStampCheck && (
                        <span className="px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200 text-3xs font-semibold flex items-center gap-1">
                          <FontAwesomeIcon icon={faStamp} />
                          Perlu Cek Stempel Manual
                        </span>
                      )}

                      {field.expectedKeywords && field.expectedKeywords.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-3xs font-semibold">
                          Keyword OCR: {field.expectedKeywords.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => openEditDocModal(field)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faEdit} className="text-gray-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          type: 'doc',
                          id: field.id,
                          label: field.label,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 2: SYARAT BIODATA BUILDER                                    */}
      {/* ================================================================= */}
      {activeTab === 'biodata' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-5 rounded-2xl border border-gray-100 shadow-xs">
            <div>
              <h2 className="text-base font-black text-gray-900">Builder Syarat Biodata</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Konfigurasi formulir isian data diri dinamis yang harus diisi pendaftar
              </p>
            </div>
            <button
              type="button"
              onClick={openAddBioModal}
              className="px-4 py-2 rounded-xl bg-[#005621] hover:bg-[#004219] text-white font-bold text-xs transition-all shadow-xs inline-flex items-center gap-2 cursor-pointer self-start sm:self-auto"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Tambah Field Biodata</span>
            </button>
          </div>

          {program.biodataFields.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
              <p className="text-sm font-bold text-gray-800">Belum ada syarat biodata yang dikonfigurasi.</p>
              <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                Tambahkan field data diri seperti Nama, NPM, Fakultas, Penghasilan Orang Tua, dsb.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {program.biodataFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-gray-200 transition-all"
                >
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-6 h-6 rounded-lg bg-gray-100 text-gray-700 font-black text-2xs flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <h3 className="text-sm font-black text-gray-900 truncate">{field.label}</h3>
                      <span className="text-3xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded-md font-semibold">
                        key: {field.key}
                      </span>
                      <span className="text-3xs font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 uppercase">
                        tipe: {field.tipe}
                      </span>
                      <span
                        className={`text-3xs font-bold px-2 py-0.5 rounded-md border ${
                          field.required
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : 'bg-gray-100 text-gray-600 border-gray-200'
                        }`}
                      >
                        {field.required ? 'Wajib' : 'Opsional'}
                      </span>
                    </div>

                    {field.options && field.options.length > 0 && (
                      <p className="text-2xs text-gray-500 pt-1 font-medium">
                        Pilihan opsi: <span className="text-gray-700 font-semibold">{field.options.join(', ')}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => openEditBioModal(field)}
                      className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faEdit} className="text-gray-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setDeleteTarget({
                          type: 'bio',
                          id: field.id,
                          label: field.label,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} />
                      <span>Hapus</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 3: DATA PENDAFTAR & SELEKSI                                  */}
      {/* ================================================================= */}
      {/* ================================================================= */}
      {/* TAB 3: DATA PENDAFTAR & SELEKSI                                  */}
      {/* ================================================================= */}
      {activeTab === 'pendaftar' && (
        <div className="space-y-5">
          {/* Header Ringkasan & Ekspor */}
          <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-gray-900">Kelola Seleksi &amp; Data Pendaftar</h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-3xs font-extrabold border border-emerald-200">
                  {initialSubmissions.length} Pendaftar
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 max-w-2xl">
                Sistem pengelompokan pendaftar: pisahkan berkas yang valid untuk dikomparasi secara cermat, dan tinjau berkas yang bermasalah secara terpisah.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() =>
                  handleExportCsv(
                    selectionViewMode === 'layak'
                      ? displayedPoolLayak
                      : selectionViewMode === 'bermasalah'
                      ? displayedPoolBermasalah
                      : initialSubmissions,
                    selectionViewMode === 'layak'
                      ? 'Kandidat_Layak'
                      : selectionViewMode === 'bermasalah'
                      ? 'Berkas_Catatan'
                      : 'Semua_Pendaftar'
                  )
                }
                className="px-3.5 py-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer shadow-2xs"
                title="Unduh data tabel saat ini ke format CSV/Excel"
              >
                <FontAwesomeIcon icon={faFileExcel} className="text-emerald-600" />
                <span>Ekspor CSV / Excel</span>
              </button>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-gray-100 shadow-2xs">
              <p className="text-3xs font-bold uppercase tracking-wider text-gray-400">Total Pendaftar</p>
              <p className="text-lg font-black text-gray-900 mt-0.5">
                {submissionMeta.statusCounts.all || initialSubmissions.length}
              </p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 bg-emerald-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-3xs font-bold uppercase tracking-wider text-emerald-800">Berkas Layak</p>
                <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-500 text-xs" />
              </div>
              <p className="text-lg font-black text-emerald-700 mt-0.5">{poolLayakAll.length}</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-2xs">
              <div className="flex items-center justify-between">
                <p className="text-3xs font-bold uppercase tracking-wider text-amber-800">Ada Catatan</p>
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-500 text-xs" />
              </div>
              <p className="text-lg font-black text-amber-700 mt-0.5">{poolBermasalahAll.length}</p>
            </div>
            <div className="bg-white p-3.5 rounded-2xl border border-emerald-100 shadow-2xs">
              <p className="text-3xs font-bold uppercase tracking-wider text-emerald-700">Ditetapkan Lolos</p>
              <p className="text-lg font-black text-emerald-800 mt-0.5">
                {submissionMeta.statusCounts.lolos || 0}
              </p>
            </div>
          </div>

          {/* 3 SUB-TABS SELECTOR */}
          <div className="bg-white p-1.5 rounded-2xl border border-gray-100 shadow-2xs flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => {
                setSelectionViewMode('layak');
                setSelectedSubIds([]);
              }}
              className={`flex-1 min-w-[200px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${
                selectionViewMode === 'layak'
                  ? 'bg-[#005621] text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FontAwesomeIcon icon={faCheckCircle} className={selectionViewMode === 'layak' ? 'text-emerald-300' : 'text-emerald-600'} />
              <span>Berkas Memenuhi Syarat (Kandidat Layak)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-3xs font-black ${
                  selectionViewMode === 'layak' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800'
                }`}
              >
                {poolLayakAll.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectionViewMode('bermasalah');
                setSelectedSubIds([]);
              }}
              className={`flex-1 min-w-[200px] px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${
                selectionViewMode === 'bermasalah'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FontAwesomeIcon icon={faExclamationTriangle} className={selectionViewMode === 'bermasalah' ? 'text-amber-200' : 'text-amber-600'} />
              <span>Berkas Ada Catatan (Perlu Verifikasi)</span>
              <span
                className={`px-2 py-0.5 rounded-full text-3xs font-black ${
                  selectionViewMode === 'bermasalah' ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {poolBermasalahAll.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSelectionViewMode('semua');
                setSelectedSubIds([]);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center justify-center gap-2 ${
                selectionViewMode === 'semua'
                  ? 'bg-gray-800 text-white shadow-xs'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <FontAwesomeIcon icon={faListUl} className={selectionViewMode === 'semua' ? 'text-gray-300' : 'text-gray-500'} />
              <span>Semua Pendaftar</span>
              <span
                className={`px-2 py-0.5 rounded-full text-3xs font-black ${
                  selectionViewMode === 'semua' ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                {initialSubmissions.length}
              </span>
            </button>
          </div>

          {/* ================================================================= */}
          {/* SUB-TAB 1: KANDIDAT LAYAK (BERKAS MEMENUHI SYARAT)                 */}
          {/* ================================================================= */}
          {selectionViewMode === 'layak' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Toolbar: Search, Filter Fakultas, Filter Status Layak, Sorting */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-md">
                    <FontAwesomeIcon
                      icon={faSearch}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
                    />
                    <input
                      type="text"
                      placeholder="Cari nama, NPM, atau token pendaftar..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#005621]"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Filter Fakultas & Sort */}
                  <div className="flex flex-wrap items-center gap-2">
                    {availableFakultas.length > 0 && (
                      <select
                        value={filterFakultas}
                        onChange={(e) => setFilterFakultas(e.target.value)}
                        className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:border-[#005621] cursor-pointer"
                      >
                        <option value="all">Semua Fakultas</option>
                        {availableFakultas.map((fak) => (
                          <option key={fak} value={fak}>
                            {fak}
                          </option>
                        ))}
                      </select>
                    )}

                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value as any)}
                      className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-700 bg-white focus:outline-none focus:border-[#005621] cursor-pointer"
                    >
                      <option value="default">Urutan: Terbaru</option>
                      <option value="ipk_desc">Komparasi: IPK Tertinggi</option>
                      <option value="penghasilan_asc">Komparasi: Penghasilan Terendah</option>
                      <option value="nama_asc">Nama (A - Z)</option>
                    </select>
                  </div>
                </div>

                {/* Sub-Filter Status Kelulusan Dalam Kandidat Layak */}
                <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-gray-100">
                  <span className="text-3xs font-extrabold uppercase text-gray-400 tracking-wider mr-1">
                    Status Seleksi:
                  </span>
                  {[
                    { key: 'all', label: 'Semua Layak', count: poolLayakAll.length },
                    {
                      key: 'belum_diseleksi',
                      label: 'Belum Diseleksi',
                      count: poolLayakAll.filter((s) => s.status === 'belum_diseleksi').length,
                    },
                    {
                      key: 'lolos',
                      label: 'Lolos Seleksi',
                      count: poolLayakAll.filter((s) => s.status === 'lolos').length,
                    },
                    {
                      key: 'tidak_lolos',
                      label: 'Tidak Lolos',
                      count: poolLayakAll.filter((s) => s.status === 'tidak_lolos').length,
                    },
                  ].map((flt) => (
                    <button
                      key={flt.key}
                      type="button"
                      onClick={() => setCandidateStatusFilter(flt.key as any)}
                      className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                        candidateStatusFilter === flt.key
                          ? 'bg-emerald-700 text-white shadow-2xs'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      <span>{flt.label}</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
                          candidateStatusFilter === flt.key
                            ? 'bg-white/20 text-white'
                            : 'bg-white text-gray-700'
                        }`}
                      >
                        {flt.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabel Komparasi Kandidat Layak */}
              {displayedPoolLayak.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-3">
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Tidak Ada Pendaftar yang Cocok</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    {poolLayakAll.length === 0
                      ? 'Belum ada pendaftar yang berkasnya terverifikasi sesuai syarat otomatis.'
                      : 'Tidak ada kandidat layak yang sesuai dengan pencarian atau filter yang dipilih.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 border-b border-gray-100 text-3xs font-black uppercase tracking-wider text-gray-400">
                        <tr>
                          <th className="p-4 w-10 text-center">
                            <input
                              type="checkbox"
                              checked={
                                displayedPoolLayak.length > 0 &&
                                displayedPoolLayak.every((c) => selectedSubIds.includes(c.id))
                              }
                              onChange={() => toggleSelectAll(displayedPoolLayak)}
                              className="rounded border-gray-300 text-[#005621] focus:ring-[#005621] cursor-pointer"
                              title="Pilih semua di tampilan ini"
                            />
                          </th>
                          <th className="p-4">Tanggal &amp; Token</th>
                          <th className="p-4">Identitas Pendaftar</th>
                          <th className="p-4">Data Komparasi (Akademik &amp; Finansial)</th>
                          <th className="p-4">Dokumen Gabungan</th>
                          <th className="p-4">Status Seleksi</th>
                          <th className="p-4 text-right">Aksi Seleksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayedPoolLayak.map((sub) => {
                          const vals = sub.biodataValues || {};
                          const nama = vals.nama || vals.nama_lengkap || vals.nama_pengusul || 'Pendaftar';
                          const kontak = vals.no_hp || vals.no_wa || vals.whatsapp || vals.email || '-';
                          const idNum = vals.npm || vals.nik || vals.nim || '';
                          const fak = getBiodataValue(vals, ['fakultas', 'fakultas_asal']);
                          const prodi = getBiodataValue(vals, ['prodi', 'program_studi', 'jurusan']);
                          const ipk = getBiodataValue(vals, ['ipk', 'ip_semester', 'indeks_prestasi']);
                          const penghasilan = getBiodataValue(vals, [
                            'penghasilan_orang_tua',
                            'penghasilan_ayah',
                            'penghasilan_ibu',
                            'ukt',
                            'biaya_ukt',
                          ]);

                          const isSelected = selectedSubIds.includes(sub.id);

                          const statusBadgeMap: any = {
                            belum_diseleksi: 'bg-purple-50 text-purple-800 border-purple-200',
                            lolos: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                            tidak_lolos: 'bg-rose-50 text-rose-800 border-rose-200',
                          };

                          return (
                            <tr
                              key={sub.id}
                              className={`transition-colors ${
                                isSelected ? 'bg-emerald-50/40 hover:bg-emerald-50/60' : 'hover:bg-gray-50/60'
                              }`}
                            >
                              <td className="p-4 text-center align-top">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={() => toggleSelectOne(sub.id)}
                                  className="rounded border-gray-300 text-[#005621] focus:ring-[#005621] cursor-pointer"
                                />
                              </td>

                              <td className="p-4 align-top">
                                <p className="font-bold text-gray-900">{formatTgl(sub.submittedAt)}</p>
                                <p className="text-3xs font-mono text-gray-400 mt-0.5 truncate max-w-[120px]">
                                  {sub.token}
                                </p>
                              </td>

                              <td className="p-4 align-top">
                                <p className="font-bold text-gray-900 text-sm">{nama}</p>
                                <p className="text-2xs text-gray-500 font-medium">
                                  {idNum ? `${idNum} • ` : ''}{kontak}
                                </p>
                              </td>

                              {/* Data Komparasi Seleksi */}
                              <td className="p-4 align-top space-y-1">
                                <p className="text-2xs font-semibold text-gray-800">
                                  {fak !== '-' ? fak : ''}{prodi !== '-' ? (fak !== '-' ? ` / ${prodi}` : prodi) : '-'}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                  {ipk !== '-' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-3xs font-bold">
                                      <FontAwesomeIcon icon={faGraduationCap} className="text-blue-500" />
                                      <span>IPK: {ipk}</span>
                                    </span>
                                  )}
                                  {penghasilan !== '-' && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-900 border border-amber-200 text-3xs font-bold">
                                      <FontAwesomeIcon icon={faMoneyBillWave} className="text-amber-600" />
                                      <span>{penghasilan}</span>
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Dokumen PDF */}
                              <td className="p-4 align-top">
                                {sub.linkDokumenGabungan ? (
                                  <a
                                    href={sub.linkDokumenGabungan}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-2xs font-bold border border-blue-200 inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                                  >
                                    <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-xs" />
                                    <span>Unduh PDF</span>
                                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs" />
                                  </a>
                                ) : (
                                  <span className="text-3xs text-gray-400 italic">Belum dibuat</span>
                                )}
                              </td>

                              {/* Status Seleksi */}
                              <td className="p-4 align-top">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-black uppercase tracking-wider ${
                                    statusBadgeMap[sub.status] || 'bg-gray-100 text-gray-600 border-gray-200'
                                  }`}
                                >
                                  {sub.status === 'lolos' && <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-xs" />}
                                  {sub.status === 'tidak_lolos' && <FontAwesomeIcon icon={faTimesCircle} className="text-rose-600 text-xs" />}
                                  {sub.status === 'belum_diseleksi' && <FontAwesomeIcon icon={faClock} className="text-purple-600 text-xs" />}
                                  <span>{sub.status.replace(/_/g, ' ')}</span>
                                </span>
                              </td>

                              {/* Aksi Seleksi */}
                              <td className="p-4 align-top text-right space-y-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingSub(sub)}
                                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-2xs font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Lihat detail biodata dan berkas lengkap"
                                  >
                                    <FontAwesomeIcon icon={faEye} />
                                    <span>Detail</span>
                                  </button>

                                  <select
                                    value={sub.status}
                                    onChange={(e) => handleChangeSubmissionStatus(sub.id, e.target.value)}
                                    disabled={isPending}
                                    className="px-2.5 py-1 rounded-lg border border-gray-300 text-2xs font-bold text-gray-800 bg-white focus:outline-none focus:border-[#005621] cursor-pointer shadow-2xs"
                                  >
                                    <option value="belum_diseleksi">Belum Diseleksi</option>
                                    <option value="lolos">Lolos</option>
                                    <option value="tidak_lolos">Tidak Lolos</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-TAB 2: BERKAS ADA CATATAN / BERMASALAH                         */}
          {/* ================================================================= */}
          {selectionViewMode === 'bermasalah' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Alert Info */}
              <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-3 text-xs text-amber-950">
                <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 text-base shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-extrabold text-amber-950">
                    Catatan Verifikasi Berkas dari Sistem ({poolBermasalahAll.length} Pendaftar)
                  </p>
                  <p className="text-2xs text-amber-800 leading-relaxed font-medium">
                    Daftar di bawah memuat pendaftar yang memiliki ketidaksesuaian berkas (misal: nama pendaftar di berkas berbeda dengan formulir, kata kunci OCR tidak lengkap, atau gagal diproses). Admin dapat meninjau berkas via tombol <strong>Detail</strong> dan tetap dapat meloloskannya secara manual jika berkas dinilai sah.
                  </p>
                </div>
              </div>

              {/* Search */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs">
                <div className="relative max-w-md">
                  <FontAwesomeIcon
                    icon={faSearch}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Cari pendaftar dengan catatan berkas..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-amber-600"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Tabel Berkas Ada Catatan */}
              {displayedPoolBermasalah.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center text-2xl mx-auto mb-3">
                    <FontAwesomeIcon icon={faCheckCircle} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Tidak Ada Berkas Bermasalah</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    {poolBermasalahAll.length === 0
                      ? 'Luar biasa! Seluruh berkas pendaftar terverifikasi sesuai syarat tanpa catatan warning.'
                      : 'Tidak ada pendaftar bermasalah yang cocok dengan pencarian Anda.'}
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 border-b border-gray-100 text-3xs font-black uppercase tracking-wider text-gray-400">
                        <tr>
                          <th className="p-4">Tanggal &amp; Token</th>
                          <th className="p-4">Identitas Pendaftar</th>
                          <th className="p-4">Catatan Verifikasi Berkas</th>
                          <th className="p-4">PDF Gabungan</th>
                          <th className="p-4">Status Pendaftar</th>
                          <th className="p-4 text-right">Aksi Peninjauan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {displayedPoolBermasalah.map((sub) => {
                          const vals = sub.biodataValues || {};
                          const nama = vals.nama || vals.nama_lengkap || vals.nama_pengusul || 'Pendaftar';
                          const kontak = vals.no_hp || vals.no_wa || vals.whatsapp || vals.email || '-';
                          const idNum = vals.npm || vals.nik || '';
                          const warningsList = Array.isArray(sub.warnings) ? sub.warnings : [];

                          const statusBadgeMap: any = {
                            menunggu_diproses: 'bg-amber-50 text-amber-800 border-amber-200',
                            sedang_diproses: 'bg-blue-50 text-blue-800 border-blue-200',
                            belum_diseleksi: 'bg-purple-50 text-purple-800 border-purple-200',
                            lolos: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                            tidak_lolos: 'bg-rose-50 text-rose-800 border-rose-200',
                            gagal_diproses: 'bg-gray-100 text-gray-800 border-gray-300',
                          };

                          return (
                            <tr key={sub.id} className="hover:bg-amber-50/30 transition-colors">
                              <td className="p-4 align-top">
                                <p className="font-bold text-gray-900">{formatTgl(sub.submittedAt)}</p>
                                <p className="text-3xs font-mono text-gray-400 mt-0.5 truncate max-w-[120px]">
                                  {sub.token}
                                </p>
                              </td>

                              <td className="p-4 align-top">
                                <p className="font-bold text-gray-900 text-sm">{nama}</p>
                                <p className="text-2xs text-gray-500 font-medium">
                                  {idNum ? `${idNum} • ` : ''}{kontak}
                                </p>
                              </td>

                              {/* Kolom Catatan Warning Berkas */}
                              <td className="p-4 align-top">
                                {warningsList.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingSub(sub)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-black bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 transition-all cursor-pointer shadow-2xs group"
                                    title="Klik untuk membuka rincian berkas yang bermasalah"
                                  >
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 text-xs" />
                                    <span>{warningsList.length} Catatan Berkas</span>
                                    <span className="text-3xs text-amber-700 underline font-bold group-hover:text-amber-950">
                                      (Periksa Detail)
                                    </span>
                                  </button>
                                ) : sub.status === 'gagal_diproses' ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-3xs font-bold bg-rose-50 text-rose-700 border-rose-200">
                                    <FontAwesomeIcon icon={faTimesCircle} className="text-rose-500 text-xs" />
                                    <span>Gagal Verifikasi Antrean</span>
                                  </span>
                                ) : (
                                  <span className="text-3xs text-gray-400">-</span>
                                )}
                              </td>

                              {/* PDF Gabungan */}
                              <td className="p-4 align-top">
                                {sub.linkDokumenGabungan ? (
                                  <a
                                    href={sub.linkDokumenGabungan}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-2xs font-bold border border-blue-200 inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                                  >
                                    <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-xs" />
                                    <span>Unduh PDF</span>
                                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs" />
                                  </a>
                                ) : (
                                  <span className="text-3xs text-gray-400 italic">Belum dibuat</span>
                                )}
                              </td>

                              {/* Status Pendaftar */}
                              <td className="p-4 align-top">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-black uppercase tracking-wider ${
                                    statusBadgeMap[sub.status] || 'bg-gray-100 text-gray-600 border-gray-200'
                                  }`}
                                >
                                  {sub.status === 'lolos' && <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-xs" />}
                                  {sub.status === 'tidak_lolos' && <FontAwesomeIcon icon={faTimesCircle} className="text-rose-600 text-xs" />}
                                  {sub.status === 'belum_diseleksi' && <FontAwesomeIcon icon={faClock} className="text-purple-600 text-xs" />}
                                  {sub.status === 'gagal_diproses' && <FontAwesomeIcon icon={faExclamationTriangle} className="text-gray-600 text-xs" />}
                                  <span>{sub.status.replace(/_/g, ' ')}</span>
                                </span>
                              </td>

                              {/* Aksi */}
                              <td className="p-4 align-top text-right space-y-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingSub(sub)}
                                    className="px-2.5 py-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-2xs font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Tinjau detail dan putuskan kelulusan"
                                  >
                                    <FontAwesomeIcon icon={faEye} />
                                    <span>Tinjau Detail</span>
                                  </button>

                                  <select
                                    value={sub.status}
                                    onChange={(e) => handleChangeSubmissionStatus(sub.id, e.target.value)}
                                    disabled={isPending}
                                    className="px-2.5 py-1 rounded-lg border border-gray-300 text-2xs font-bold text-gray-800 bg-white focus:outline-none focus:border-amber-600 cursor-pointer shadow-2xs"
                                  >
                                    <option value="belum_diseleksi">Belum Diseleksi</option>
                                    <option value="lolos">Lolos (Verifikasi Manual)</option>
                                    <option value="tidak_lolos">Tidak Lolos</option>
                                    <option value="gagal_diproses">Gagal Diproses</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-TAB 3: SEMUA PENDAFTAR (MASTER VIEW)                          */}
          {/* ================================================================= */}
          {selectionViewMode === 'semua' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Filter Status Submissions Lama */}
              <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-wrap items-center gap-2">
                {[
                  { key: 'all', label: 'Semua', count: submissionMeta.statusCounts.all },
                  { key: 'menunggu_diproses', label: 'Menunggu Diproses', count: submissionMeta.statusCounts.menunggu_diproses },
                  { key: 'sedang_diproses', label: 'Sedang Diproses', count: submissionMeta.statusCounts.sedang_diproses },
                  { key: 'belum_diseleksi', label: 'Belum Diseleksi', count: submissionMeta.statusCounts.belum_diseleksi },
                  { key: 'lolos', label: 'Lolos Seleksi', count: submissionMeta.statusCounts.lolos },
                  { key: 'tidak_lolos', label: 'Tidak Lolos', count: submissionMeta.statusCounts.tidak_lolos },
                  { key: 'gagal_diproses', label: 'Gagal Diproses', count: submissionMeta.statusCounts.gagal_diproses },
                ].map((st) => (
                  <button
                    key={st.key}
                    type="button"
                    onClick={() => handleFilterStatus(st.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                      subStatusFilter === st.key
                        ? 'bg-[#005621] text-white shadow-2xs'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
                        subStatusFilter === st.key ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {st.count || 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* Master Tabel */}
              {initialSubmissions.length === 0 ? (
                <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-xs">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center text-2xl mx-auto mb-3">
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Belum Ada Pendaftar</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Pendaftaran untuk program ini masih kosong atau tidak ada pendaftar dengan status yang dipilih.
                  </p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50/80 border-b border-gray-100 text-3xs font-black uppercase tracking-wider text-gray-400">
                        <tr>
                          <th className="p-4">Tanggal &amp; Token</th>
                          <th className="p-4">Identitas Pendaftar</th>
                          <th className="p-4">Status Pendaftar</th>
                          <th className="p-4">Verifikasi Berkas</th>
                          <th className="p-4">PDF Gabungan</th>
                          <th className="p-4 text-right">Aksi Seleksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {initialSubmissions.map((sub) => {
                          const vals = sub.biodataValues || {};
                          const nama = vals.nama || vals.nama_lengkap || vals.nama_pengusul || 'Pendaftar';
                          const kontak = vals.no_hp || vals.no_wa || vals.whatsapp || vals.email || '-';
                          const idNum = vals.npm || vals.nik || '';

                          const statusBadgeMap: any = {
                            menunggu_diproses: 'bg-amber-50 text-amber-800 border-amber-200',
                            sedang_diproses: 'bg-blue-50 text-blue-800 border-blue-200',
                            belum_diseleksi: 'bg-purple-50 text-purple-800 border-purple-200',
                            lolos: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                            tidak_lolos: 'bg-rose-50 text-rose-800 border-rose-200',
                            gagal_diproses: 'bg-gray-100 text-gray-800 border-gray-300',
                          };

                          const warningsList = Array.isArray(sub.warnings) ? sub.warnings : [];

                          return (
                            <tr key={sub.id} className="hover:bg-gray-50/60 transition-colors">
                              <td className="p-4 align-top">
                                <p className="font-bold text-gray-900">{formatTgl(sub.submittedAt)}</p>
                                <p className="text-3xs font-mono text-gray-400 mt-0.5 truncate max-w-[120px]">
                                  {sub.token}
                                </p>
                              </td>

                              <td className="p-4 align-top">
                                <p className="font-bold text-gray-900 text-sm">{nama}</p>
                                <p className="text-2xs text-gray-500 font-medium">
                                  {idNum ? `${idNum} • ` : ''}{kontak}
                                </p>
                              </td>

                              {/* KOLOM 1: STATUS PENDAFTAR */}
                              <td className="p-4 align-top">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-black uppercase tracking-wider ${
                                    statusBadgeMap[sub.status] || 'bg-gray-100 text-gray-600 border-gray-200'
                                  }`}
                                >
                                  {sub.status === 'lolos' && <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-xs" />}
                                  {sub.status === 'tidak_lolos' && <FontAwesomeIcon icon={faTimesCircle} className="text-rose-600 text-xs" />}
                                  {sub.status === 'belum_diseleksi' && <FontAwesomeIcon icon={faClock} className="text-purple-600 text-xs" />}
                                  {sub.status === 'sedang_diproses' && <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600 text-xs" />}
                                  {sub.status === 'menunggu_diproses' && <FontAwesomeIcon icon={faClock} className="text-amber-600 text-xs" />}
                                  {sub.status === 'gagal_diproses' && <FontAwesomeIcon icon={faExclamationTriangle} className="text-gray-600 text-xs" />}
                                  <span>{sub.status.replace(/_/g, ' ')}</span>
                                </span>
                              </td>

                              {/* KOLOM 2: VERIFIKASI BERKAS / WARNING */}
                              <td className="p-4 align-top">
                                {sub.status === 'lolos' ? (
                                  <span
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-extrabold bg-emerald-50 text-emerald-800 border-emerald-200"
                                    title="Pendaftar telah diverifikasi dan disetujui admin."
                                  >
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-xs" />
                                    <span>Terverifikasi Disetujui</span>
                                  </span>
                                ) : warningsList.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => setViewingSub(sub)}
                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-black bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 hover:border-amber-400 transition-all cursor-pointer shadow-2xs group"
                                    title="Klik untuk membuka rincian berkas yang bermasalah di pop-up detail"
                                  >
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 text-xs" />
                                    <span>{warningsList.length} Catatan Berkas</span>
                                    <span className="text-3xs text-amber-600 font-bold underline ml-0.5 group-hover:text-amber-900">
                                      (Detail)
                                    </span>
                                  </button>
                                ) : ['menunggu_diproses', 'sedang_diproses'].includes(sub.status) ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-bold bg-gray-50 text-gray-600 border-gray-200">
                                    <FontAwesomeIcon icon={faClock} className="text-gray-400 text-xs" />
                                    <span>Menunggu Antrean</span>
                                  </span>
                                ) : sub.status === 'gagal_diproses' ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-bold bg-rose-50 text-rose-700 border-rose-200">
                                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-rose-500 text-xs" />
                                    <span>Gagal Verifikasi</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-extrabold bg-emerald-50 text-emerald-700 border-emerald-200">
                                    <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-xs" />
                                    <span>Berkas Sesuai</span>
                                  </span>
                                )}
                              </td>

                              <td className="p-4 align-top">
                                {sub.linkDokumenGabungan ? (
                                  <a
                                    href={sub.linkDokumenGabungan}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-2xs font-bold border border-blue-200 inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                                  >
                                    <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-xs" />
                                    <span>Unduh PDF</span>
                                    <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs" />
                                  </a>
                                ) : (
                                  <span className="text-3xs text-gray-400 italic">Belum dibuat</span>
                                )}
                              </td>

                              <td className="p-4 align-top text-right space-y-2">
                                <div className="flex items-center justify-end gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setViewingSub(sub)}
                                    className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 text-2xs font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs"
                                    title="Lihat detail biodata dan berkas lengkap"
                                  >
                                    <FontAwesomeIcon icon={faEye} />
                                    <span>Detail</span>
                                  </button>

                                  <select
                                    value={sub.status}
                                    onChange={(e) => handleChangeSubmissionStatus(sub.id, e.target.value)}
                                    disabled={isPending}
                                    className="px-2.5 py-1 rounded-lg border border-gray-300 text-2xs font-bold text-gray-800 bg-white focus:outline-none focus:border-[#005621] cursor-pointer shadow-2xs"
                                  >
                                    <option value="belum_diseleksi">Belum Diseleksi</option>
                                    <option value="lolos">Lolos</option>
                                    <option value="tidak_lolos">Tidak Lolos</option>
                                    <option value="menunggu_diproses">Menunggu Diproses</option>
                                    <option value="sedang_diproses">Sedang Diproses</option>
                                    <option value="gagal_diproses">Gagal Diproses</option>
                                  </select>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* FLOATING BULK ACTION BAR */}
          {selectedSubIds.length > 0 && selectionViewMode === 'layak' && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900/95 backdrop-blur-md text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-gray-700/80 flex flex-wrap items-center gap-3 sm:gap-4 animate-slideUp">
              <div className="flex items-center gap-2 pr-2 border-r border-gray-700">
                <FontAwesomeIcon icon={faCheckSquare} className="text-emerald-400 text-sm" />
                <span className="text-xs font-bold whitespace-nowrap">
                  {selectedSubIds.length} Pendaftar Dipilih
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={bulkUpdating}
                  onClick={() => handleBulkSetStatus('lolos')}
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <FontAwesomeIcon icon={faCheckCircle} />
                  <span>Tetapkan Lolos</span>
                </button>

                <button
                  type="button"
                  disabled={bulkUpdating}
                  onClick={() => handleBulkSetStatus('tidak_lolos')}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold inline-flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <FontAwesomeIcon icon={faTimesCircle} />
                  <span>Tidak Lolos</span>
                </button>

                <button
                  type="button"
                  disabled={bulkUpdating}
                  onClick={() => setSelectedSubIds([])}
                  className="px-3 py-1.5 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800 text-xs font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================================================================= */}
      {/* TAB 4: PENGATURAN PROGRAM                                        */}
      {/* ================================================================= */}
      {activeTab === 'pengaturan' && (
        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-xs max-w-2xl">
          <h2 className="text-base font-black text-gray-900 mb-1">Pengaturan Informasi Program</h2>
          <p className="text-xs text-gray-500 mb-6">
            Ubah nama, status buka/tutup pendaftaran, serta folder Google Drive template
          </p>

          <form onSubmit={handleSaveProgramSettings} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Nama Program Bantuan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={progNama}
                onChange={(e) => setProgNama(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Slug URL Pendaftaran
              </label>
              <input
                type="text"
                required
                value={progSlug}
                onChange={(e) => setProgSlug(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
              />
              <p className="text-3xs text-gray-400 mt-1">
                Akan diakses publik melalui: <code className="text-gray-700 font-mono">/pendaftaran/{progSlug}</code>
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Status Pendaftaran
              </label>
              <select
                value={progStatus}
                onChange={(e) => setProgStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[#005621]"
              >
                <option value="draft">Draft</option>
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
                  value={progTanggalBuka}
                  onChange={(e) => setProgTanggalBuka(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tanggal Tutup
                </label>
                <input
                  type="date"
                  value={progTanggalTutup}
                  onChange={(e) => setProgTanggalTutup(e.target.value)}
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
                value={progLinkDriveTemplate}
                onChange={(e) => setProgLinkDriveTemplate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Deskripsi Program
              </label>
              <textarea
                rows={3}
                value={progDeskripsi}
                onChange={(e) => setProgDeskripsi(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={progSubmitting}
                className="px-5 py-2.5 rounded-xl bg-[#005621] text-white font-bold text-xs hover:bg-[#004219] transition-all shadow-xs cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
              >
                {progSubmitting && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                <span>Simpan Perubahan Pengaturan</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: TAMBAH / EDIT DOKUMEN FIELD                               */}
      {/* ================================================================= */}
      {isDocModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsDocModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto transform transition-all animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900">
                {editingDoc ? 'Edit Syarat Dokumen' : 'Tambah Syarat Dokumen Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsDocModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveDoc} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nama / Label Dokumen <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Surat Rekomendasi Dosen Wali"
                  value={docLabel}
                  onChange={(e) => setDocLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Key Identifikasi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: surat_rekomendasi"
                    value={docKey}
                    onChange={(e) => setDocKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Masa Berlaku Maks (Bulan)
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Contoh: 6"
                    value={docMaxAgeMonths}
                    onChange={(e) => setDocMaxAgeMonths(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Kata Kunci OCR yang Diharapkan (Pisahkan koma)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: surat keterangan, tidak mampu, kepala desa"
                  value={docKeywordsStr}
                  onChange={(e) => setDocKeywordsStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
                <p className="text-3xs text-gray-400 mt-1">
                  Sistem OCR akan mendeteksi kecocokan kata kunci untuk mencegah salah upload berkas.
                </p>
              </div>

              {/* Flags Checklist */}
              <div className="space-y-2.5 pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={docRequired}
                    onChange={(e) => setDocRequired(e.target.checked)}
                    className="rounded text-[#005621] focus:ring-[#005621] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-800">
                    Dokumen Wajib Diupload (Required)
                  </span>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={docNameCheck}
                    onChange={(e) => setDocNameCheck(e.target.checked)}
                    className="rounded text-[#005621] focus:ring-[#005621] w-4 h-4 cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-semibold text-gray-800 block">
                      Cocokkan Nama Pendaftar dengan Isi Dokumen (Fuzzy Levenshtein)
                    </span>
                    <span className="text-3xs text-gray-400">
                      Aktifkan hanya untuk dokumen identitas pendaftar (KTP, KTM, SKTM pendaftar). Jangan aktifkan untuk surat rekomendasi dosen atau berkas orang tua.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={docSingleCombined}
                    onChange={(e) => setDocSingleCombined(e.target.checked)}
                    className="rounded text-[#005621] focus:ring-[#005621] w-4 h-4 cursor-pointer mt-0.5"
                  />
                  <div>
                    <span className="text-xs font-semibold text-gray-800 block">
                      Format Foto Gabungan Mandiri (isSingleCombinedUpload)
                    </span>
                    <span className="text-3xs text-gray-400">
                      Untuk berkas seperti Foto Rumah di mana pendaftar menggabungkan sendiri beberapa foto jadi satu file sesuai template. Lewati OCR teks namun tetap gabungkan ke PDF akhir.
                    </span>
                  </div>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={docNeedsStamp}
                    onChange={(e) => setDocNeedsStamp(e.target.checked)}
                    className="rounded text-[#005621] focus:ring-[#005621] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-800">
                    Tandai untuk Cek Stempel / Tanda Tangan Basah Manual oleh Admin
                  </span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsDocModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={docSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#005621] text-white font-bold text-xs hover:bg-[#004219] transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {docSubmitting && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                  <span>{editingDoc ? 'Simpan Perubahan' : 'Tambahkan Dokumen'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: TAMBAH / EDIT BIODATA FIELD                               */}
      {/* ================================================================= */}
      {isBioModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setIsBioModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto transform transition-all animate-scaleUp"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="text-base font-black text-gray-900">
                {editingBio ? 'Edit Field Biodata' : 'Tambah Field Biodata Baru'}
              </h3>
              <button
                type="button"
                onClick={() => setIsBioModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-sm p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveBio} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Label Pertanyaan / Data <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Nomor Pokok Mahasiswa (NPM)"
                  value={bioLabel}
                  onChange={(e) => setBioLabel(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Key Identifikasi (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: npm"
                    value={bioKey}
                    onChange={(e) => setBioKey(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Tipe Input
                  </label>
                  <select
                    value={bioTipe}
                    onChange={(e) => setBioTipe(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold focus:outline-none focus:border-[#005621]"
                  >
                    <option value="text">Teks Pendek (Text)</option>
                    <option value="number">Angka (Number)</option>
                    <option value="date">Tanggal (Date)</option>
                    <option value="textarea">Teks Panjang (Textarea)</option>
                    <option value="select">Pilihan Dropdown (Select)</option>
                    <option value="radio">Pilihan Radio (Radio Button)</option>
                  </select>
                </div>
              </div>

              {['select', 'radio'].includes(bioTipe) && (
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Opsi Pilihan (Tulis 1 opsi per baris)
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Opsi 1&#10;Opsi 2&#10;Opsi 3"
                    value={bioOptionsStr}
                    onChange={(e) => setBioOptionsStr(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                  />
                </div>
              )}

              <div className="pt-2 border-t border-gray-100">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={bioRequired}
                    onChange={(e) => setBioRequired(e.target.checked)}
                    className="rounded text-[#005621] focus:ring-[#005621] w-4 h-4 cursor-pointer"
                  />
                  <span className="text-xs font-semibold text-gray-800">
                    Field Wajib Diisi (Required)
                  </span>
                </label>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsBioModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={bioSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#005621] text-white font-bold text-xs hover:bg-[#004219] transition-all shadow-xs cursor-pointer flex items-center gap-2 disabled:opacity-50"
                >
                  {bioSubmitting && <FontAwesomeIcon icon={faSpinner} className="animate-spin" />}
                  <span>{editingBio ? 'Simpan Perubahan' : 'Tambahkan Field'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* MODAL: DETAIL SUBMISSION                                         */}
      {/* ================================================================= */}
      {viewingSub && (() => {
        const vals = viewingSub.biodataValues || {};
        const namaPendaftar =
          vals.nama_lengkap ||
          vals.nama ||
          vals.nama_mahasiswa ||
          vals.nama_pengusul ||
          vals.nama_pendaftar ||
          'Pendaftar';
        const isLolos = viewingSub.status === 'lolos';
        const subWarnings: any[] = Array.isArray(viewingSub.warnings) ? viewingSub.warnings : [];

        // Dokumen yang wajib tapi tidak diunggah
        const missingRequiredDocs = !isLolos
          ? program.documentFields.filter(
              (f) => f.required && !viewingSub.documents?.some((d) => d.fieldKey === f.key)
            )
          : [];

        const statusBadgeMap: any = {
          menunggu_diproses: 'bg-amber-50 text-amber-800 border-amber-200',
          sedang_diproses: 'bg-blue-50 text-blue-800 border-blue-200',
          belum_diseleksi: 'bg-purple-50 text-purple-800 border-purple-200',
          lolos: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          tidak_lolos: 'bg-rose-50 text-rose-800 border-rose-200',
          gagal_diproses: 'bg-gray-100 text-gray-800 border-gray-300',
        };

        return (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
            onClick={() => setViewingSub(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-2xl w-full p-6 space-y-5 max-h-[90vh] overflow-y-auto transform transition-all animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="flex items-start justify-between pb-3 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-gray-900">
                      Detail Pendaftaran &amp; Verifikasi Berkas
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded-md border text-3xs font-black uppercase tracking-wider ${
                        statusBadgeMap[viewingSub.status] || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {viewingSub.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <p className="text-2xs text-gray-500 mt-0.5">
                    Nama Pendaftar: <strong className="text-gray-900 text-xs font-black">{namaPendaftar}</strong> • Token:{' '}
                    <span className="font-mono text-gray-600">{viewingSub.token}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingSub(null)}
                  className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Status Seleksi Action Bar */}
              <div className="p-3.5 bg-gray-50/90 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <label className="block text-2xs font-extrabold uppercase text-gray-500 tracking-wider">
                    Ubah Status Kelulusan Pendaftar:
                  </label>
                  <p className="text-3xs text-gray-400 mt-0.5">
                    Memilih &ldquo;Lolos&rdquo; akan mengonfirmasi kelulusan dan menghapus tanda warning berkas.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={viewingSub.status}
                    onChange={(e) => handleChangeSubmissionStatus(viewingSub.id, e.target.value)}
                    disabled={isPending}
                    className="px-3 py-1.5 rounded-xl border border-gray-300 text-xs font-bold text-gray-800 bg-white shadow-2xs focus:outline-none focus:border-[#005621] cursor-pointer"
                  >
                    <option value="belum_diseleksi">Belum Diseleksi</option>
                    <option value="lolos">Lolos Seleksi</option>
                    <option value="tidak_lolos">Tidak Lolos</option>
                    <option value="menunggu_diproses">Menunggu Diproses</option>
                    <option value="sedang_diproses">Sedang Diproses</option>
                    <option value="gagal_diproses">Gagal Diproses</option>
                  </select>
                </div>
              </div>

              {/* Banner Status Lolos / Peringatan */}
              {isLolos ? (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-2.5 text-xs text-emerald-900">
                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-lg shrink-0" />
                  <div>
                    <p className="font-extrabold text-emerald-900">Pendaftar Telah Diberi Status LOLOS SELEKSI</p>
                    <p className="text-3xs text-emerald-700 font-medium">
                      Admin telah menyetujui kelulusan pendaftar ini. Seluruh peringatan berkas telah dikesampingkan/diverifikasi manual.
                    </p>
                  </div>
                </div>
              ) : subWarnings.length > 0 ? (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-2.5 text-xs text-amber-900">
                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 text-base shrink-0 mt-0.5" />
                  <div>
                    <p className="font-extrabold text-amber-950">
                      Terdapat {subWarnings.length} Catatan Verifikasi Otomatis pada Berkas
                    </p>
                    <p className="text-3xs text-amber-800 font-medium">
                      Silakan periksa rincian pada berkas terkait di bawah ini sebelum menetapkan status seleksi.
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Dokumen Wajib Kurang (jika ada) */}
              {missingRequiredDocs.length > 0 && (
                <div className="p-3.5 bg-red-50 rounded-xl border border-red-200 space-y-1.5">
                  <p className="text-xs font-black text-red-900 flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faTimesCircle} className="text-red-500" />
                    <span>Dokumen Wajib yang Belum Diunggah ({missingRequiredDocs.length}):</span>
                  </p>
                  <ul className="text-2xs text-red-800 list-disc list-inside space-y-0.5 font-medium">
                    {missingRequiredDocs.map((m) => (
                      <li key={m.id}>
                        <span className="font-bold">{m.label}</span> — berkas ini wajib tetapi tidak ditemukan.
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Dokumen yang Diunggah dengan Rincian Warning Per Berkas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FontAwesomeIcon icon={faFileAlt} className="text-gray-500" />
                    <span>Dokumen yang Diunggah &amp; Status Verifikasi ({viewingSub.documents?.length || 0})</span>
                  </h4>
                </div>

                <div className="space-y-2.5">
                  {viewingSub.documents?.map((doc) => {
                    const fieldDef = program.documentFields.find((f) => f.key === doc.fieldKey);
                    const docLabel = fieldDef?.label || doc.fieldKey.replace(/_/g, ' ');

                    // Filter warning khusus untuk dokumen ini
                    const docWarnings = isLolos
                      ? []
                      : subWarnings.filter((w) => {
                          if (typeof w === 'object' && w.fieldKey) {
                            return w.fieldKey === doc.fieldKey;
                          }
                          if (typeof w === 'string') {
                            return (
                              w.toLowerCase().includes(doc.fieldKey.toLowerCase()) ||
                              (fieldDef && w.toLowerCase().includes(fieldDef.label.toLowerCase()))
                            );
                          }
                          return false;
                        });

                    const hasWarning = docWarnings.length > 0;
                    const hasNameMismatch = docWarnings.some((w) => typeof w === 'object' && w.type === 'name_mismatch');

                    return (
                      <div
                        key={doc.id}
                        className={`p-3.5 rounded-xl border transition-all ${
                          isLolos
                            ? 'bg-emerald-50/30 border-emerald-200'
                            : hasNameMismatch
                            ? 'bg-rose-50/50 border-rose-300 shadow-2xs'
                            : hasWarning
                            ? 'bg-amber-50/40 border-amber-300 shadow-2xs'
                            : 'bg-gray-50/70 border-gray-200'
                        }`}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-extrabold text-gray-900 text-xs truncate">
                                {docLabel}
                              </p>
                              {fieldDef?.required && (
                                <span className="px-1.5 py-0.2 rounded bg-red-100 text-red-700 text-3xs font-extrabold">
                                  Wajib
                                </span>
                              )}
                              {fieldDef?.nameCheckApplicable && (
                                <span
                                  className="px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-3xs font-bold"
                                  title="Berkas ini mencakup verifikasi kesesuaian nama pendaftar"
                                >
                                  Cek Nama OCR
                                </span>
                              )}
                            </div>
                            <p className="text-3xs text-gray-500 font-mono truncate mt-0.5">
                              {doc.originalFilename}
                            </p>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            {/* Label status per file */}
                            {isLolos ? (
                              <span className="px-2 py-0.5 rounded-lg text-3xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1">
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>Lolos</span>
                              </span>
                            ) : hasNameMismatch ? (
                              <span className="px-2 py-0.5 rounded-lg text-3xs font-black bg-rose-100 text-rose-900 border border-rose-300 inline-flex items-center gap-1">
                                <FontAwesomeIcon icon={faTimesCircle} className="text-rose-600" />
                                <span>Nama Tidak Sesuai</span>
                              </span>
                            ) : hasWarning ? (
                              <span className="px-2 py-0.5 rounded-lg text-3xs font-black bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600" />
                                <span>{docWarnings.length} Catatan</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-lg text-3xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1">
                                <FontAwesomeIcon icon={faCheckCircle} />
                                <span>Sesuai</span>
                              </span>
                            )}

                            <a
                              href={doc.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 rounded-lg bg-white border border-gray-200 text-blue-600 hover:text-blue-800 font-bold text-2xs inline-flex items-center gap-1 shadow-2xs transition-colors"
                            >
                              <FontAwesomeIcon icon={faFolderOpen} />
                              <span>Buka File</span>
                              <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs" />
                            </a>
                          </div>
                        </div>

                        {/* Rincian catatan untuk dokumen spesifik ini */}
                        {hasWarning && (
                          <div className={`mt-2.5 p-2.5 rounded-lg border space-y-1 ${
                            hasNameMismatch ? 'bg-rose-50 border-rose-200' : 'bg-amber-50 border-amber-200/80'
                          }`}>
                            <p className={`text-3xs font-black uppercase tracking-wider flex items-center gap-1 ${
                              hasNameMismatch ? 'text-rose-950' : 'text-amber-950'
                            }`}>
                              <FontAwesomeIcon icon={faExclamationTriangle} className={hasNameMismatch ? 'text-rose-600' : 'text-amber-600'} />
                              <span>Catatan Verifikasi Berkas Ini:</span>
                            </p>
                            <div className="space-y-1 pt-0.5">
                              {docWarnings.map((w: any, widx: number) => {
                                const isMismatch = typeof w === 'object' && w.type === 'name_mismatch';
                                return (
                                  <div
                                    key={widx}
                                    className={`flex items-start gap-1.5 text-2xs leading-relaxed ${
                                      isMismatch
                                        ? 'text-rose-900 font-bold bg-white/70 p-1.5 rounded border border-rose-200'
                                        : 'text-amber-900 font-medium'
                                    }`}
                                  >
                                    <span className={`${isMismatch ? 'text-rose-600' : 'text-amber-500'} font-bold shrink-0`}>•</span>
                                    <span>{typeof w === 'string' ? w : w.message || JSON.stringify(w)}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Unduh PDF Gabungan jika tersedia */}
              {viewingSub.linkDokumenGabungan && (
                <a
                  href={viewingSub.linkDokumenGabungan}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 flex items-center justify-center gap-2 transition-colors"
                >
                  <FontAwesomeIcon icon={faFilePdf} className="text-red-500 text-sm" />
                  <span>Unduh Seluruh Berkas Gabungan (PDF Master)</span>
                  <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs" />
                </a>
              )}

              {/* Isian Biodata Pendaftar */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <h4 className="text-xs font-black text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                  <FontAwesomeIcon icon={faUserTag} className="text-gray-500" />
                  <span>Isian Biodata Pendaftar</span>
                </h4>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {Object.entries(viewingSub.biodataValues || {}).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-3xs font-bold text-gray-400 uppercase">{key.replace(/_/g, ' ')}</p>
                      <p className="font-semibold text-gray-900 mt-0.5">
                        {typeof val === 'object' ? JSON.stringify(val) : String(val || '-')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Modal */}
              <div className="pt-3 flex items-center justify-end border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setViewingSub(null)}
                  className="px-4 py-2 rounded-xl bg-gray-900 text-white font-bold text-xs hover:bg-gray-800 cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ================================================================= */}
      {/* MODAL: KONFIRMASI HAPUS FIELD                                    */}
      {/* ================================================================= */}
      <ConfirmModal
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteFieldConfirm}
        title={deleteTarget?.type === 'doc' ? 'Hapus Syarat Dokumen?' : 'Hapus Field Biodata?'}
        message={`Apakah Anda yakin ingin menghapus "${deleteTarget?.label}"? Konfigurasi ini akan dihapus dari form pendaftaran program.`}
        confirmText="Ya, Hapus"
        loading={deleteLoading}
        type="danger"
      />
    </div>
  );
}
