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
  faChevronDown,
} from '@fortawesome/free-solid-svg-icons';
import {
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
    kategori?: string | null;
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
  const [activeTab, setActiveTab] = useState<'dokumen' | 'biodata' | 'pendaftar'>('dokumen');

  // Toasts
  const [toast, setToast] = useState<ToastState | null>(null);

  // Filter Submissions
  const [subStatusFilter, setSubStatusFilter] = useState(initialStatus);

  // Sub-tabs & Selection Mode
  const [selectionViewMode, setSelectionViewMode] = useState<'layak' | 'bermasalah' | 'semua'>('layak');
  const [selectedSubIds, setSelectedSubIds] = useState<string[]>([]);
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const [updatingSubId, setUpdatingSubId] = useState<string | null>(null);
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
  // HANDLERS: SUBMISSION STATUS
  // ----------------------------------------------------
  async function handleChangeSubmissionStatus(submissionId: string, newStatus: string) {
    setUpdatingSubId(submissionId);
    startTransition(async () => {
      try {
        const res = await updateSubmissionStatus(submissionId, newStatus);
        if (res.success) {
          setToast({ message: `Status pendaftar diubah menjadi "${newStatus.replace(/_/g, ' ')}".`, type: 'success' });
          setViewingSub((prev) => (prev && prev.id === submissionId ? { ...prev, status: newStatus } : prev));
          router.refresh();
        } else {
          setToast({ message: res.error || 'Gagal mengubah status.', type: 'error' });
        }
      } catch (err: any) {
        setToast({ message: err?.message || 'Gagal mengubah status.', type: 'error' });
      } finally {
        setUpdatingSubId(null);
      }
    });
  }

  function renderStatusBadgeSelector(sub: SubmissionItem, size: 'sm' | 'md' = 'sm') {
    const isUpdating = updatingSubId === sub.id;
    const isMd = size === 'md';

    return (
      <div className="relative inline-flex items-center group">
        <span
          className={`absolute ${
            isMd ? 'left-3 text-sm' : 'left-2.5 text-xs'
          } top-1/2 -translate-y-1/2 pointer-events-none z-10 flex items-center`}
        >
          {isUpdating ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-500" />
          ) : sub.status === 'lolos' ? (
            <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600" />
          ) : sub.status === 'tidak_lolos' ? (
            <FontAwesomeIcon icon={faTimesCircle} className="text-rose-600" />
          ) : sub.status === 'belum_diseleksi' ? (
            <FontAwesomeIcon icon={faClock} className="text-purple-600" />
          ) : sub.status === 'sedang_diproses' ? (
            <FontAwesomeIcon icon={faSpinner} className="animate-spin text-blue-600" />
          ) : sub.status === 'menunggu_diproses' ? (
            <FontAwesomeIcon icon={faClock} className="text-amber-600" />
          ) : (
            <FontAwesomeIcon icon={faExclamationTriangle} className="text-gray-600" />
          )}
        </span>

        <select
          value={sub.status}
          onChange={(e) => handleChangeSubmissionStatus(sub.id, e.target.value)}
          disabled={isPending || isUpdating}
          title="Klik untuk mengubah status pendaftar"
          className={`appearance-none ${
            isMd
              ? 'pl-8 pr-7 py-1.5 text-xs font-extrabold'
              : 'pl-7 pr-6 py-1 text-3xs font-black'
          } rounded-lg border uppercase tracking-wider whitespace-nowrap cursor-pointer shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
            sub.status === 'lolos'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100/80 focus:ring-emerald-400'
              : sub.status === 'tidak_lolos'
              ? 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100/80 focus:ring-rose-400'
              : sub.status === 'belum_diseleksi'
              ? 'bg-purple-50 text-purple-800 border-purple-300 hover:bg-purple-100/80 focus:ring-purple-400'
              : sub.status === 'sedang_diproses'
              ? 'bg-blue-50 text-blue-800 border-blue-300 hover:bg-blue-100/80 focus:ring-blue-400'
              : sub.status === 'menunggu_diproses'
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100/80 focus:ring-amber-400'
              : 'bg-gray-100 text-gray-800 border-gray-300 hover:bg-gray-200/80 focus:ring-gray-400'
          }`}
        >
          <option value="belum_diseleksi" className="bg-white text-gray-900 font-semibold normal-case">
            Belum Diseleksi
          </option>
          <option value="lolos" className="bg-white text-emerald-900 font-semibold normal-case">
            Lolos
          </option>
          <option value="tidak_lolos" className="bg-white text-rose-900 font-semibold normal-case">
            Tidak Lolos
          </option>
          <option value="menunggu_diproses" className="bg-white text-amber-900 font-semibold normal-case">
            Menunggu Diproses
          </option>
          <option value="sedang_diproses" className="bg-white text-blue-900 font-semibold normal-case">
            Sedang Diproses
          </option>
          <option value="gagal_diproses" className="bg-white text-gray-900 font-semibold normal-case">
            Gagal Diproses
          </option>
        </select>

        <FontAwesomeIcon
          icon={faChevronDown}
          className={`absolute ${
            isMd ? 'right-2.5 text-xs' : 'right-2 text-3xs'
          } top-1/2 -translate-y-1/2 pointer-events-none opacity-60 text-current transition-transform group-hover:translate-y-[-40%]`}
        />
      </div>
    );
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

  function cleanWarningNote(msg: string, docLabel?: string): string {
    if (!msg) return '';
    let cleaned = msg;
    cleaned = cleaned.replace(/^Berkas\s+["'][^"']+["']\s+/i, '');
    cleaned = cleaned.replace(/Kesesuaian nama bermasalah:\s*/i, '');
    cleaned = cleaned.replace(/Nama pendaftar\s+["'][^"']+["']\s+/i, 'Nama ');
    cleaned = cleaned.replace(/nama\s+["'][^"']+["']\s+/i, 'nama ');
    cleaned = cleaned.replace(/^Teks\s+pada berkas\s+["'][^"']+["']\s+/i, 'Teks ');
    cleaned = cleaned.replace(/pada berkas\s+["'][^"']+["']/gi, 'pada berkas');
    cleaned = cleaned.replace(/^Masa berlaku berkas\s+["'][^"']+["']\s+/i, 'Masa berlaku ');
    if (docLabel) {
      const escapedLabel = docLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      cleaned = cleaned.replace(new RegExp(`\\s*["']${escapedLabel}["']\\s*`, 'gi'), ' ');
    }
    cleaned = cleaned.trim();
    if (cleaned.length > 0) {
      cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }
    return cleaned;
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

      {/* Top Header outside Card (Style from admin/program) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <Link
            href="/admin/pendaftaran"
            className="w-10 h-10 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0 shadow-2xs mt-0.5 sm:mt-0"
            title="Kembali ke Daftar Program"
          >
            <FontAwesomeIcon icon={faArrowLeft} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              {program.nama}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Link
            href={`/pendaftaran/${program.slug}`}
            target="_blank"
            className="px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 font-bold text-xs shadow-2xs inline-flex items-center gap-2 transition-colors"
          >
            <span>Lihat Form Publik</span>
            <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs text-gray-400" />
          </Link>
        </div>
      </div>

      {/* Main Unified Card Container (Style from admin/program) */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Integrated Tab Navigation Bar */}
        <div className="flex items-center border-b border-gray-100 bg-white px-3 sm:px-6 overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('dokumen')}
            className={`px-4 py-3.5 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === 'dokumen'
                ? 'border-[#005621] text-[#005621]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FontAwesomeIcon icon={faFileAlt} />
            <span>Syarat Dokumen</span>
            <span
              className={`px-2 py-0.5 rounded-full text-3xs font-extrabold ${
                activeTab === 'dokumen'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {program.documentFields.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('biodata')}
            className={`px-4 py-3.5 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === 'biodata'
                ? 'border-[#005621] text-[#005621]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FontAwesomeIcon icon={faUserTag} />
            <span>Formulir Biodata</span>
            <span
              className={`px-2 py-0.5 rounded-full text-3xs font-extrabold ${
                activeTab === 'biodata'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {program.biodataFields.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pendaftar')}
            className={`px-4 py-3.5 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 shrink-0 border-b-2 ${
              activeTab === 'pendaftar'
                ? 'border-[#005621] text-[#005621]'
                : 'border-transparent text-gray-500 hover:text-gray-900'
            }`}
          >
            <FontAwesomeIcon icon={faUsers} />
            <span>Data Pendaftar & Seleksi</span>
            <span
              className={`px-2 py-0.5 rounded-full text-3xs font-extrabold ${
                activeTab === 'pendaftar'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {submissionMeta.total}
            </span>
          </button>
        </div>

      {/* ================================================================= */}
      {/* TAB 1: SYARAT DOKUMEN BUILDER                                    */}
      {/* ================================================================= */}
      {activeTab === 'dokumen' && (
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Daftar Syarat Dokumen</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Konfigurasi berkas dan dokumen persyaratan yang harus diunggah pendaftar
              </p>
            </div>
            <button
              type="button"
              onClick={openAddDocModal}
              className="flex items-center gap-2 bg-[#005621] hover:bg-[#004219] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Tambah Syarat Dokumen</span>
            </button>
          </div>

          {program.documentFields.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="flex flex-col items-center gap-2">
                <FontAwesomeIcon icon={faFileAlt} className="text-4xl text-gray-200 mb-1" />
                <p className="text-sm font-semibold text-gray-700">Belum ada syarat dokumen yang ditambahkan</p>
                <p className="text-xs text-gray-400 max-w-md">
                  Program ini belum mensyaratkan upload berkas apa pun. Klik &quot;Tambah Syarat Dokumen&quot; untuk menambahkan berkas seperti KTP, KTM, surat permohonan, dsb.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {program.documentFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 truncate">{field.label}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditDocModal(field)}
                      title="Edit Syarat Dokumen"
                      className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faEdit} className="w-3.5 h-3.5" />
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
                      title="Hapus Syarat Dokumen"
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} className="w-3.5 h-3.5" />
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
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-5 border-b border-gray-100 bg-gray-50/50">
            <div>
              <h2 className="text-sm font-bold text-gray-800">Daftar Formulir Biodata</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Konfigurasi kolom formulir isian data diri yang harus diisi oleh pendaftar
              </p>
            </div>
            <button
              type="button"
              onClick={openAddBioModal}
              className="flex items-center gap-2 bg-[#005621] hover:bg-[#004219] text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <FontAwesomeIcon icon={faPlus} />
              <span>Tambah Field Biodata</span>
            </button>
          </div>

          {program.biodataFields.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <div className="flex flex-col items-center gap-2">
                <FontAwesomeIcon icon={faUserTag} className="text-4xl text-gray-200 mb-1" />
                <p className="text-sm font-semibold text-gray-700">Belum ada field biodata yang dikonfigurasi</p>
                <p className="text-xs text-gray-400 max-w-md">
                  Tambahkan pertanyaan data diri seperti Nama, NPM, Fakultas, Penghasilan Orang Tua, dsb.
                </p>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {program.biodataFields.map((field, idx) => (
                <div
                  key={field.id}
                  className="p-4 sm:px-6 flex items-center justify-between gap-4 hover:bg-gray-50/60 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-gray-100 text-gray-700 font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <h3 className="text-sm font-bold text-gray-900 truncate">{field.label}</h3>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditBioModal(field)}
                      title="Edit Field Biodata"
                      className="w-8 h-8 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-600 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faEdit} className="w-3.5 h-3.5" />
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
                      title="Hapus Field Biodata"
                      className="w-8 h-8 rounded-lg bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                    >
                      <FontAwesomeIcon icon={faTrashAlt} className="w-3.5 h-3.5" />
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
      {activeTab === 'pendaftar' && (
        <div>
          {/* Header Ringkasan & Ekspor */}
          <div className="p-5 border-b border-gray-100 bg-white flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h2 className="text-base font-black text-gray-900">Kelola Seleksi &amp; Data Pendaftar</h2>
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


          {/* 3 SUB-TABS SELECTOR */}
          <div className="px-5 py-3 border-b border-gray-100 bg-white flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectionViewMode('layak');
                setSelectedSubIds([]);
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
                selectionViewMode === 'layak'
                  ? 'bg-[#005621] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
                selectionViewMode === 'bermasalah'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
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
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
                selectionViewMode === 'semua'
                  ? 'bg-gray-800 text-white shadow-xs'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <FontAwesomeIcon icon={faListUl} className={selectionViewMode === 'semua' ? 'text-gray-300' : 'text-gray-500'} />
              <span>Semua Pendaftar</span>
              <span
                className={`px-2 py-0.5 rounded-full text-3xs font-black ${
                  selectionViewMode === 'semua' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
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
            <div className="animate-fadeIn">
              {/* Toolbar: Search, Filter Fakultas, Sorting */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
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
                      className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-[#005621] bg-white placeholder-gray-400"
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
              </div>

              {/* Tabel Komparasi Kandidat Layak */}
              {displayedPoolLayak.length === 0 ? (
                <div className="p-12 text-center">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50/90 border-b border-gray-200 text-3xs font-black uppercase tracking-wider text-gray-500">
                      <tr className="divide-x divide-gray-100">
                        <th className="p-4 text-left">Tanggal &amp; Token</th>
                        <th className="p-4 text-left">Identitas Pendaftar</th>
                        <th className="p-4 text-left">Data Komparasi (Akademik &amp; Finansial)</th>
                        <th className="p-4 text-left">Dokumen Gabungan</th>
                        <th className="p-4 text-left">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
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

                        return (
                          <tr
                            key={sub.id}
                            className="divide-x divide-gray-100 transition-colors hover:bg-gray-50/60"
                          >
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

                            {/* Aksi */}
                            <td className="p-4 align-top text-left">
                              <div className="flex items-center">
                                <button
                                  type="button"
                                  onClick={() => setViewingSub(sub)}
                                  className="px-3 py-1.5 rounded-lg border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/60 text-gray-700 hover:text-emerald-800 text-2xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors group"
                                  title="Lihat detail biodata dan berkas lengkap untuk musyawarah"
                                >
                                  <FontAwesomeIcon icon={faEye} className="text-gray-400 group-hover:text-emerald-600" />
                                  <span>Detail</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-TAB 2: BERKAS ADA CATATAN / BERMASALAH                         */}
          {/* ================================================================= */}
          {selectionViewMode === 'bermasalah' && (
            <div className="animate-fadeIn">
              {/* Alert Info Banner */}
              <div className="p-4 bg-amber-50/60 border-b border-amber-200/80 flex items-start gap-3 text-xs text-amber-950">
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

              {/* Search Bar */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50">
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
                    className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-xs focus:outline-none focus:border-amber-600 bg-white placeholder-gray-400"
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
                <div className="p-12 text-center">
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50/90 border-b border-gray-200 text-3xs font-black uppercase tracking-wider text-gray-500">
                      <tr className="divide-x divide-gray-100">
                        <th className="p-4 text-left">Tanggal &amp; Token</th>
                        <th className="p-4 text-left">Identitas Pendaftar</th>
                        <th className="p-4 text-left">Catatan Verifikasi Berkas</th>
                        <th className="p-4 text-left">PDF Gabungan</th>
                        <th className="p-4 text-left">Status Pendaftar</th>
                        <th className="p-4 text-left">Aksi Peninjauan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {displayedPoolBermasalah.map((sub) => {
                        const vals = sub.biodataValues || {};
                        const nama = vals.nama || vals.nama_lengkap || vals.nama_pengusul || 'Pendaftar';
                        const kontak = vals.no_hp || vals.no_wa || vals.whatsapp || vals.email || '-';
                        const idNum = vals.npm || vals.nik || '';
                        const warningsList = Array.isArray(sub.warnings) ? sub.warnings : [];

                        return (
                          <tr key={sub.id} className="divide-x divide-gray-100 hover:bg-amber-50/20 transition-colors">
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
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-3xs font-bold bg-amber-50 text-amber-900 border-amber-200">
                                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 text-xs shrink-0" />
                                  <span>{warningsList.length} Catatan Berkas</span>
                                </span>
                              ) : sub.status === 'gagal_diproses' ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-3xs font-bold bg-rose-50 text-rose-700 border-rose-200">
                                  <FontAwesomeIcon icon={faTimesCircle} className="text-rose-500 text-xs shrink-0" />
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
                              {renderStatusBadgeSelector(sub)}
                            </td>

                            {/* Aksi Peninjauan */}
                            <td className="p-4 align-top text-left">
                              <button
                                type="button"
                                onClick={() => setViewingSub(sub)}
                                className="px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-2xs font-bold inline-flex items-center gap-1.5 cursor-pointer shadow-2xs transition-colors shrink-0"
                                title="Tinjau detail dan berkas pendaftar"
                              >
                                <FontAwesomeIcon icon={faEye} />
                                <span>Tinjau Detail</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ================================================================= */}
          {/* SUB-TAB 3: SEMUA PENDAFTAR (MASTER VIEW)                          */}
          {/* ================================================================= */}
          {selectionViewMode === 'semua' && (
            <div className="animate-fadeIn">
              {/* Filter Status Submissions */}
              <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-2">
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
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <span>{st.label}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-3xs font-black ${
                        subStatusFilter === st.key ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {st.count || 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* Master Tabel */}
              {initialSubmissions.length === 0 ? (
                <div className="p-12 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center text-2xl mx-auto mb-3">
                    <FontAwesomeIcon icon={faUsers} />
                  </div>
                  <h3 className="text-base font-bold text-gray-900">Belum Ada Pendaftar</h3>
                  <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                    Pendaftaran untuk program ini masih kosong atau tidak ada pendaftar dengan status yang dipilih.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-gray-50/90 border-b border-gray-200 text-3xs font-black uppercase tracking-wider text-gray-500">
                      <tr className="divide-x divide-gray-100">
                        <th className="p-4 text-left">Tanggal &amp; Token</th>
                        <th className="p-4 text-left">Identitas Pendaftar</th>
                        <th className="p-4 text-left">Status Pendaftar</th>
                        <th className="p-4 text-left">Verifikasi Berkas</th>
                        <th className="p-4 text-left">PDF Gabungan</th>
                        <th className="p-4 text-left">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {initialSubmissions.map((sub) => {
                        const vals = sub.biodataValues || {};
                        const nama = vals.nama || vals.nama_lengkap || vals.nama_pengusul || 'Pendaftar';
                        const kontak = vals.no_hp || vals.no_wa || vals.whatsapp || vals.email || '-';
                        const idNum = vals.npm || vals.nik || '';
                        const warningsList = Array.isArray(sub.warnings) ? sub.warnings : [];

                        return (
                          <tr key={sub.id} className="divide-x divide-gray-100 hover:bg-gray-50/60 transition-colors">
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
                              {renderStatusBadgeSelector(sub)}
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

                            <td className="p-4 align-top text-left">
                              <button
                                type="button"
                                onClick={() => setViewingSub(sub)}
                                className="px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-[#005621] text-gray-700 hover:text-[#005621] hover:bg-gray-50 text-2xs font-bold inline-flex items-center gap-1 cursor-pointer shadow-2xs transition-colors shrink-0"
                                title="Lihat detail biodata dan berkas lengkap"
                              >
                                <FontAwesomeIcon icon={faEye} />
                                <span>Detail</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Unified Card Container Closing Tag */}
      </div>



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
        const isLolos = viewingSub.status === 'lolos';
        const subWarnings: any[] = Array.isArray(viewingSub.warnings) ? viewingSub.warnings : [];

        // Dokumen yang wajib tapi tidak diunggah
        const missingRequiredDocs = !isLolos
          ? program.documentFields.filter(
              (f) => f.required && !viewingSub.documents?.some((d) => d.fieldKey === f.key)
            )
          : [];

        return (
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
            onClick={() => setViewingSub(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl border border-gray-100 max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden transform transition-all animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header Modal */}
              <div className="p-5 sm:px-6 border-b border-gray-100 flex items-center justify-between gap-4 bg-gray-50/60">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h3 className="text-lg sm:text-xl font-black text-gray-900 tracking-tight">
                      Detail Pendaftaran
                    </h3>
                    {renderStatusBadgeSelector(viewingSub, 'md')}
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-normal flex flex-wrap items-center gap-2">
                    <span className="font-mono text-gray-500">Token: {viewingSub.token}</span>
                    <span>•</span>
                    <span>{formatTgl(viewingSub.submittedAt)}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingSub(null)}
                  className="w-8 h-8 rounded-xl bg-white border border-gray-200 hover:bg-gray-100 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer text-sm shrink-0 shadow-2xs"
                  title="Tutup Modal"
                >
                  ✕
                </button>
              </div>

              {/* Body Modal (Scrollable) */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
                {/* Status Alert Banner */}
                {isLolos ? (
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center gap-3 text-emerald-950">
                    <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600 text-xl shrink-0" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-emerald-950">Pendaftar Telah Berstatus LOLOS SELEKSI</p>
                      <p className="text-xs text-emerald-800 font-normal leading-relaxed">
                        Admin telah menyetujui kelulusan pendaftar ini. Seluruh catatan peringatan berkas telah dikesampingkan atau diverifikasi manual.
                      </p>
                    </div>
                  </div>
                ) : subWarnings.length > 0 ? (
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 flex items-start gap-3 text-amber-950">
                    <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600 text-lg shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <p className="font-bold text-sm text-amber-950">
                        Terdapat {subWarnings.length} Catatan Verifikasi Otomatis pada Berkas
                      </p>
                      <p className="text-xs text-amber-800 font-normal leading-relaxed">
                        Silakan periksa rincian catatan berkas di bawah ini. Anda dapat meloloskan atau menolak pendaftar secara langsung via dropdown status di atas.
                      </p>
                    </div>
                  </div>
                ) : null}

                {/* Dokumen yang Belum Diunggah */}
                {missingRequiredDocs.length > 0 && (
                  <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 space-y-1.5">
                    <p className="text-sm font-bold text-rose-900 flex items-center gap-1.5">
                      <FontAwesomeIcon icon={faTimesCircle} className="text-rose-500" />
                      <span>Dokumen yang Belum Diunggah ({missingRequiredDocs.length}):</span>
                    </p>
                    <ul className="text-xs text-rose-800 list-disc list-inside space-y-1 font-normal">
                      {missingRequiredDocs.map((m) => (
                        <li key={m.id}>
                          <span className="font-semibold">{m.label}</span> — berkas ini belum diunggah oleh pendaftar.
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* SECTION 1: FORMULIR BIODATA */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between pb-1.5 border-b border-gray-100">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <FontAwesomeIcon icon={faUserTag} className="text-[#005621]" />
                      <span>Formulir Biodata Pendaftar</span>
                    </h4>
                  </div>

                  <div className="bg-gray-50/80 rounded-xl p-4 sm:p-5 border border-gray-100 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {(() => {
                      const configuredKeys = new Set(program.biodataFields.map((f) => f.key));
                      const items: { label: string; value: any }[] = [];

                      program.biodataFields.forEach((f) => {
                        const val = vals[f.key] !== undefined && vals[f.key] !== null ? vals[f.key] : '-';
                        items.push({ label: f.label, value: val });
                      });

                      Object.entries(vals).forEach(([k, v]) => {
                        if (!configuredKeys.has(k)) {
                          const label = k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
                          items.push({ label, value: v });
                        }
                      });

                      return items.map((item, idx) => (
                        <div key={idx} className="space-y-1 min-w-0">
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider leading-snug">
                            {item.label}
                          </p>
                          <p className="text-sm font-normal text-gray-800 break-words leading-snug">
                            {typeof item.value === 'object' ? JSON.stringify(item.value) : String(item.value || '-')}
                          </p>
                        </div>
                      ));
                    })()}
                  </div>
                </div>

                {/* SECTION 2: DOKUMEN & VERIFIKASI BERKAS */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1.5 border-b border-gray-100">
                    <h4 className="text-sm font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <FontAwesomeIcon icon={faFileAlt} className="text-[#005621]" />
                      <span>Berkas yang Diunggah ({viewingSub.documents?.length || 0})</span>
                    </h4>

                    {viewingSub.linkDokumenGabungan && (
                      <a
                        href={viewingSub.linkDokumenGabungan}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 inline-flex items-center gap-1.5 transition-colors self-start sm:self-auto shadow-2xs"
                      >
                        <FontAwesomeIcon icon={faFilePdf} className="text-red-500" />
                        <span>Unduh Semua PDF Gabungan</span>
                        <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs" />
                      </a>
                    )}
                  </div>

                  <div className="space-y-3">
                    {viewingSub.documents?.map((doc) => {
                      const fieldDef = program.documentFields.find((f) => f.key === doc.fieldKey);
                      const docLabel = fieldDef?.label || doc.fieldKey.replace(/_/g, ' ');

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
                      const hasNameMismatch = docWarnings.some(
                        (w) => typeof w === 'object' && w.type === 'name_mismatch'
                      );

                      return (
                        <div
                          key={doc.id}
                          className={`p-4 rounded-xl border transition-all ${
                            isLolos
                              ? 'bg-emerald-50/20 border-emerald-200'
                              : hasNameMismatch
                              ? 'bg-rose-50/40 border-rose-300'
                              : hasWarning
                              ? 'bg-amber-50/40 border-amber-300'
                              : 'bg-white border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div className="min-w-0 space-y-0.5">
                              <p className="font-bold text-gray-900 text-sm">
                                {docLabel}
                              </p>
                              <p className="text-xs text-gray-500 font-mono truncate">
                                {doc.originalFilename}
                              </p>
                            </div>

                            <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                              {isLolos ? (
                                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 inline-flex items-center gap-1.5">
                                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600" />
                                  <span>Sesuai</span>
                                </span>
                              ) : hasNameMismatch ? (
                                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 inline-flex items-center gap-1.5">
                                  <FontAwesomeIcon icon={faTimesCircle} className="text-rose-600" />
                                  <span>Nama Berbeda</span>
                                </span>
                              ) : hasWarning ? (
                                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-50 text-amber-900 border border-amber-200 inline-flex items-center gap-1.5">
                                  <FontAwesomeIcon icon={faExclamationTriangle} className="text-amber-600" />
                                  <span>{docWarnings.length} Catatan</span>
                                </span>
                              ) : (
                                <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                                  <FontAwesomeIcon icon={faCheckCircle} className="text-emerald-600" />
                                  <span>Sesuai</span>
                                </span>
                              )}

                              <a
                                href={doc.fileUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3.5 py-1.5 rounded-lg bg-white border border-gray-200 hover:border-[#005621] text-gray-700 hover:text-[#005621] font-bold text-xs inline-flex items-center gap-1.5 shadow-2xs transition-colors"
                              >
                                <FontAwesomeIcon icon={faFolderOpen} className="text-gray-400" />
                                <span>Lihat Berkas</span>
                                <FontAwesomeIcon icon={faExternalLinkAlt} className="text-3xs" />
                              </a>
                            </div>
                          </div>

                          {/* Rincian catatan warning berkas */}
                          {hasWarning && (
                            <div
                              className={`mt-3 p-3 rounded-lg border space-y-1.5 ${
                                hasNameMismatch ? 'bg-rose-50/80 border-rose-200' : 'bg-amber-50/80 border-amber-200'
                              }`}
                            >
                              <p
                                className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${
                                  hasNameMismatch ? 'text-rose-950' : 'text-amber-950'
                                }`}
                              >
                                <FontAwesomeIcon
                                  icon={faExclamationTriangle}
                                  className={hasNameMismatch ? 'text-rose-600' : 'text-amber-600'}
                                />
                                <span>Catatan Verifikasi Berkas:</span>
                              </p>
                              <div className="space-y-1.5 pt-0.5">
                                {docWarnings.map((w: any, widx: number) => {
                                  const isMismatch = typeof w === 'object' && w.type === 'name_mismatch';
                                  return (
                                    <div
                                      key={widx}
                                      className={`flex items-start gap-2 text-xs font-normal leading-relaxed ${
                                        isMismatch
                                          ? 'text-rose-950 bg-white/80 p-2 rounded-lg border border-rose-200'
                                          : 'text-amber-950'
                                      }`}
                                    >
                                      <span className={`${isMismatch ? 'text-rose-600' : 'text-amber-500'} font-normal shrink-0 mt-0.5`}>
                                        •
                                      </span>
                                      <span className="font-normal">
                                        {cleanWarningNote(typeof w === 'string' ? w : w.message || JSON.stringify(w), docLabel)}
                                      </span>
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
              </div>

              {/* Footer Modal */}
              <div className="p-4 sm:px-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <p className="text-xs text-gray-500 font-normal">
                  Perubahan status pendaftar akan tersimpan secara otomatis.
                </p>
                <button
                  type="button"
                  onClick={() => setViewingSub(null)}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 text-white font-bold text-xs sm:text-sm hover:bg-gray-800 cursor-pointer shadow-2xs transition-colors"
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
