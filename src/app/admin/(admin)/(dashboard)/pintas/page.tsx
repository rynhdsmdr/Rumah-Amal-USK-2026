'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Doughnut, Line } from 'react-chartjs-2';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHandHoldingHeart } from '@fortawesome/free-solid-svg-icons';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Filler);

interface PintasData {
  kuotaTersedia: number;
  infaqMasuk: number;
  tersalurkan: number;
  dicadangkan: number;
  pengajuanDisetujui?: number;
  pengajuanProses?: number;
  definisi: string | null;
  syaratAdmin: string | null;
  alurPendaftaran: string | null;
  linkDownload: string | null;
  linkDownloadMahasiswa?: string | null;
  linkDownloadDosenStaff?: string | null;
  linkGformMahasiswa?: string | null;
  linkGformDosenStaff?: string | null;
  linkInformasi: string | null;
  noWaAdmin?: string | null;
  updatedAt: string;
}

interface SetoranRecord {
  id: string;
  borrowerId: string;
  nominal: number;
  tanggalSetor: string;
  metode: string;
  bankPengirim?: string;
  nomorRekeningPengirim?: string;
  namaPengirim?: string;
  buktiTransferUrl: string | null;
  buktiFileName?: string;
  buktiPurged: boolean;
  purgedAt?: string | null;
  catatan?: string | null;
  status: 'TERVERIFIKASI' | 'MENUNGGU_VERIFIKASI' | 'DITOLAK';
  verifiedAt?: string | null;
  rejectionReason?: string | null;
}

interface BorrowerRecord {
  id: string;
  identifier: string;
  nama: string;
  peran: string;
  unitFakultas: string;
  noWa: string;
  email: string;
  totalPinjaman: number;
  tanggalPencairan: string;
  status: 'BELUM_LUNAS' | 'LUNAS';
  lunasAt?: string | null;
  lastReminderSentAt?: string | null;
  reminderCount: number;
  keteranganPinjaman: string;
  setoran: SetoranRecord[];
  calculation: {
    totalSetor: number;
    totalPending: number;
    sisaPinjaman: number;
    isLunas: boolean;
    retentionDaysLeft: number | null;
    isPurged: boolean;
  };
}

interface ReminderLogItem {
  id: string;
  borrowerId: string;
  borrowerName: string;
  identifier: string;
  noWa: string;
  sisaPinjaman: number;
  bulan: string;
  sentAt: string;
  status: string;
  pesan: string;
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', { style: 'decimal', minimumFractionDigits: 0 }).format(value);
}

function formatRupiahShort(value: number): string {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}M`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}Jt`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}Rb`;
  return value.toString();
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

export default function AdminPintasPage() {
  const [data, setData] = useState<PintasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'dana' | 'konten'>('dana');
  const [selectedYear, setSelectedYear] = useState('2024');
  const [yearDropdownOpen, setYearDropdownOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // Main Dashboard Sections Navigation
  const [adminSection, setAdminSection] = useState<
    'overview' | 'peminjam' | 'pengingat' | 'retensi' | 'alur_gform'
  >('overview');

  // Borrowers & Reminders state
  const [borrowers, setBorrowers] = useState<BorrowerRecord[]>([]);
  const [reminderLogs, setReminderLogs] = useState<ReminderLogItem[]>([]);
  const [loadingBorrowers, setLoadingBorrowers] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');
  const [previewBuktiModal, setPreviewBuktiModal] = useState<string | null>(null);

  // Form states
  const [kuotaTersedia, setKuotaTersedia] = useState('249500000');
  const [infaqMasuk, setInfaqMasuk] = useState('1250000000');
  const [tersalurkan, setTersalurkan] = useState('850500000');
  const [dicadangkan, setDicadangkan] = useState('0');
  const [pengajuanDisetujui, setPengajuanDisetujui] = useState('425');
  const [pengajuanProses, setPengajuanProses] = useState('75');
  const [definisi, setDefinisi] = useState('');
  const [syaratAdmin, setSyaratAdmin] = useState('');
  const [alurPendaftaran, setAlurPendaftaran] = useState('');
  const [linkDownload, setLinkDownload] = useState('https://bit.ly/berkaspintasRA');
  const [linkDownloadMahasiswa, setLinkDownloadMahasiswa] = useState(
    'https://drive.google.com/drive/folders/1rJbqX0OU4r66w4YOCWewhFU1gWlh7jFb?usp=drive_link'
  );
  const [linkDownloadDosenStaff, setLinkDownloadDosenStaff] = useState(
    'https://drive.google.com/drive/folders/1PSTXp1CRhl-3Fjbf7eNCriLUd4_kHRWe?usp=drive_link'
  );
  const [linkGformMahasiswa, setLinkGformMahasiswa] = useState(
    'https://docs.google.com/forms/d/e/1FAIpQLSdO4F8634R5P0wXolB_RcVDeF_8TOcCt18EmUxoc71jIXxnfQ/viewform'
  );
  const [linkGformDosenStaff, setLinkGformDosenStaff] = useState(
    'https://docs.google.com/forms/d/e/1FAIpQLSdXwUWUxmBmRYp15kdQz77Net9yu33EvZZ-JggvzY6UdZttKA/viewform'
  );
  const [noWaAdmin, setNoWaAdmin] = useState('628116888123');
  const [linkInformasi, setLinkInformasi] = useState(
    'https://api.whatsapp.com/send/?phone=628116888123&text&type=phone_number&app_absent=0'
  );

  const printAreaRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/pintas');
      if (res.ok) {
        const json = await res.json();
        setData(json);
        setKuotaTersedia(json.kuotaTersedia?.toString() || '249500000');
        setInfaqMasuk(json.infaqMasuk?.toString() || '1250000000');
        setTersalurkan(json.tersalurkan?.toString() || '850500000');
        setDicadangkan(json.dicadangkan?.toString() || '0');
        setPengajuanDisetujui(json.pengajuanDisetujui?.toString() || '425');
        setPengajuanProses(json.pengajuanProses?.toString() || '75');
        setDefinisi(json.definisi || '');
        setSyaratAdmin(json.syaratAdmin || '');
        setAlurPendaftaran(json.alurPendaftaran || '');
        setLinkDownload(json.linkDownload || '');
        setLinkDownloadMahasiswa(json.linkDownloadMahasiswa || 'https://bit.ly/berkaspintasRA-mahasiswa');
        setLinkDownloadDosenStaff(json.linkDownloadDosenStaff || 'https://bit.ly/berkaspintasRA-dosen-staff');
        setLinkGformMahasiswa(json.linkGformMahasiswa || 'https://bit.ly/gform-pintas-mahasiswa');
        setLinkGformDosenStaff(json.linkGformDosenStaff || 'https://bit.ly/gform-pintas-dosen-staff');
        setNoWaAdmin(json.noWaAdmin || '628116888123');
        setLinkInformasi(json.linkInformasi || '');
      }
    } catch (err) {
      console.error('Error fetching PINTAS data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchBorrowers = useCallback(async () => {
    setLoadingBorrowers(true);
    try {
      const res = await fetch('/api/pintas/setoran');
      if (res.ok) {
        const json = await res.json();
        setBorrowers(json);
      }
      const remRes = await fetch('/api/pintas/reminders');
      if (remRes.ok) {
        const remJson = await remRes.json();
        setReminderLogs(remJson.logs || []);
      }
    } catch (err) {
      console.error('Error fetching borrowers:', err);
    } finally {
      setLoadingBorrowers(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    fetchBorrowers();
  }, [fetchData, fetchBorrowers]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const res = await fetch('/api/pintas', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kuotaTersedia: Number(kuotaTersedia) || 0,
          infaqMasuk: Number(infaqMasuk) || 0,
          tersalurkan: Number(tersalurkan) || 0,
          dicadangkan: Number(dicadangkan) || 0,
          pengajuanDisetujui: Number(pengajuanDisetujui) || 0,
          pengajuanProses: Number(pengajuanProses) || 0,
          definisi,
          syaratAdmin,
          alurPendaftaran,
          linkDownload,
          linkDownloadMahasiswa,
          linkDownloadDosenStaff,
          linkGformMahasiswa,
          linkGformDosenStaff,
          noWaAdmin,
          linkInformasi,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setData(updated);
        setSaveMsg('✓ Data berhasil disimpan ke database!');
        setTimeout(() => {
          setShowEditModal(false);
          setSaveMsg('');
        }, 1200);
      } else {
        setSaveMsg('✗ Gagal menyimpan data');
      }
    } catch {
      setSaveMsg('✗ Terjadi kesalahan server');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySetoran = async (
    borrowerId: string,
    setoranId: string,
    status: 'TERVERIFIKASI' | 'DITOLAK'
  ) => {
    setActionLoading(true);
    try {
      const res = await fetch('/api/pintas/setoran', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerId,
          setoranId,
          status,
          verifiedBy: 'Administrator',
        }),
      });
      if (res.ok) {
        setActionMsg(`✓ Setoran berhasil diubah menjadi status ${status}`);
        fetchBorrowers();
      } else {
        setActionMsg('✗ Gagal memperbarui status setoran');
      }
    } catch {
      setActionMsg('✗ Kesalahan jaringan');
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  const handleTriggerReminders = async (borrowerId?: string) => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await fetch('/api/pintas/reminders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(borrowerId ? { borrowerId } : {}),
      });
      if (res.ok) {
        const json = await res.json();
        setActionMsg(`✓ ${json.message || 'Pengingat WA berhasil diproses!'}`);
        fetchBorrowers();
      } else {
        setActionMsg('✗ Gagal mengirim pengingat');
      }
    } catch {
      setActionMsg('✗ Terjadi kesalahan saat memicu pengingat');
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const handleTriggerAutoPurge = async () => {
    setActionLoading(true);
    setActionMsg('');
    try {
      const res = await fetch('/api/pintas/cleanup-purged', { method: 'POST' });
      if (res.ok) {
        const json = await res.json();
        setActionMsg(`✓ ${json.message}`);
        fetchBorrowers();
      } else {
        setActionMsg('✗ Gagal memicu pembersihan berkas');
      }
    } catch {
      setActionMsg('✗ Kesalahan jaringan');
    } finally {
      setActionLoading(false);
      setTimeout(() => setActionMsg(''), 4000);
    }
  };

  const setPresetImage2 = () => {
    setInfaqMasuk('1250000000');
    setTersalurkan('850500000');
    setDicadangkan('0');
    setKuotaTersedia('249500000');
    setPengajuanDisetujui('425');
    setPengajuanProses('75');
  };

  const handleExportPdf = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6 animate-pulse p-4">
        <div className="h-14 bg-gray-200 w-full rounded-2xl mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-2xl h-40 border border-gray-200" />
          ))}
        </div>
      </div>
    );
  }

  // Values calculation
  const infaqMasukVal = data?.infaqMasuk ?? 1250000000;
  const tersalurkanVal = data?.tersalurkan ?? 850500000;
  const kuotaVal = data?.kuotaTersedia ?? 249500000;

  const totalCalculated = tersalurkanVal + kuotaVal;
  const baseForPct = totalCalculated > 0 ? totalCalculated : infaqMasukVal;

  const tersalurkanPct = baseForPct > 0 ? Math.round((tersalurkanVal / baseForPct) * 100) : 77;
  const tersediaPct = baseForPct > 0 ? Math.round((kuotaVal / baseForPct) * 100) : 23;

  // Donut Chart Config
  const doughnutData = {
    labels: ['Tersalurkan', 'Tersedia'],
    datasets: [
      {
        data: [tersalurkanVal, kuotaVal],
        backgroundColor: ['#006b2b', '#f59e0b'],
        hoverBackgroundColor: ['#005522', '#d97706'],
        borderWidth: 0,
        cutout: '72%',
      },
    ],
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return ` Rp ${formatRupiah(context.raw)}`;
          },
        },
      },
    },
  };

  // Line Chart Config
  const lineMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul'];
  const lineValues = [35, 55, 45, 125, 95, 145, 165];

  const lineData = {
    labels: lineMonths,
    datasets: [
      {
        label: 'Pencairan (Juta Rp)',
        data: lineValues,
        borderColor: '#006b2b',
        borderWidth: 2.5,
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 260);
          gradient.addColorStop(0, 'rgba(0, 107, 43, 0.18)');
          gradient.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
          return gradient;
        },
        tension: 0.35,
        fill: true,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointBackgroundColor: '#006b2b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 2,
      },
    ],
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            return ` ${context.raw} Juta Rupiah`;
          },
        },
      },
    },
    scales: {
      y: {
        min: 0,
        max: 200,
        ticks: {
          stepSize: 50,
          font: { size: 12, family: 'sans-serif' },
          color: '#6b7280',
          padding: 8,
        },
        grid: { color: '#f1f5f9', drawTicks: false },
        border: { display: false },
      },
      x: {
        ticks: { font: { size: 12, family: 'sans-serif' }, color: '#6b7280', padding: 8 },
        grid: { display: false },
        border: { display: false },
      },
    },
  };

  const unpaidCount = borrowers.filter((b) => !b.calculation.isLunas).length;
  const lunasCount = borrowers.filter((b) => b.calculation.isLunas).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5 print:p-0 print:m-0" ref={printAreaRef}>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2.5">
            <FontAwesomeIcon icon={faHandHoldingHeart} className="text-[#063A1E] w-6 h-6" />
            Program PINTAS &amp; Pengelolaan Setoran
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Kelola data statistik dana, verifikasi setoran peminjam, pengingat awal bulan, dan retensi berkas 30 hari.
          </p>
        </div>

        {/* Global Action Message */}
        {actionMsg && (
          <div
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              actionMsg.startsWith('✓') ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {actionMsg}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* SECTION TABS (NAVIGASI 5 FITUR UTAMA)                                     */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/80 p-2 shadow-sm flex items-center gap-2 overflow-x-auto print:hidden">
        <button
          onClick={() => setAdminSection('overview')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            adminSection === 'overview'
              ? 'bg-[#006b2b] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Ringkasan &amp; Statistik Dana
        </button>

        <button
          onClick={() => setAdminSection('peminjam')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            adminSection === 'peminjam'
              ? 'bg-[#006b2b] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>Peminjam &amp; Verifikasi Setoran</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-white/20 text-current">
            {borrowers.length}
          </span>
        </button>

        <button
          onClick={() => setAdminSection('pengingat')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
            adminSection === 'pengingat'
              ? 'bg-[#006b2b] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <span>Pengingat Bayar Awal Bulan (WA)</span>
          {unpaidCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500 text-white font-bold">
              {unpaidCount} Belum Lunas
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminSection('retensi')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            adminSection === 'retensi'
              ? 'bg-[#006b2b] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Retensi Berkas Lunas (30 Hari)
        </button>

        <button
          onClick={() => setAdminSection('alur_gform')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
            adminSection === 'alur_gform'
              ? 'bg-[#006b2b] text-white shadow-xs'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          Integrasi Google Form &amp; WA Admin
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: OVERVIEW & STATISTIK DANA                                          */}
      {/* ========================================================================= */}
      {adminSection === 'overview' && (
        <div className="space-y-5">
          {/* Top Bar Filter & Buttons */}
          <div className="bg-white rounded-2xl border border-gray-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
            <div className="relative">
              <button
                onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
                className="flex items-center gap-2 px-3.5 py-2 bg-gray-100 hover:bg-gray-200/80 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 transition-colors border border-gray-200/60"
              >
                <span>Tahun Ini ({selectedYear})</span>
              </button>

              {yearDropdownOpen && (
                <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20">
                  {['2026', '2025', '2024', '2023'].map((yr) => (
                    <button
                      key={yr}
                      onClick={() => {
                        setSelectedYear(yr);
                        setYearDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between transition-colors ${
                        selectedYear === yr ? 'bg-emerald-50 text-[#006b2b]' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <span>Tahun {yr}</span>
                      {selectedYear === yr && <span className="text-xs">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                onClick={handleExportPdf}
                className="flex items-center justify-center px-3.5 py-2 border border-[#006b2b] text-[#006b2b] hover:bg-emerald-50/70 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.98]"
              >
                <span>Export PDF Statistik</span>
              </button>

              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center justify-center px-4 py-2 bg-[#006b2b] hover:bg-[#005522] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
              >
                <span>Sesuaikan Dana &amp; Konten</span>
              </button>
            </div>
          </div>

          {/* 3 Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
            {/* Card 1: Total Infaq Terkumpul */}
            <div
              onClick={() => setShowEditModal(true)}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Total Infaq Terkumpul</p>
                <div className="space-y-0.5">
                  <p className="font-serif text-2xl font-bold text-gray-900 leading-tight">Rp</p>
                  <p className="font-serif text-2xl font-bold text-gray-900 tracking-tight leading-none">
                    {formatRupiah(infaqMasukVal)}
                  </p>
                </div>
              </div>
              <p className="text-xs font-semibold text-[#006b2b] mt-4 flex items-center gap-1">
                <svg className="w-3 h-3 text-[#006b2b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 17L17 7m0 0H8m9 0v9" />
                </svg>
                <span>+12.5% dari bulan lalu</span>
              </p>
            </div>

            {/* Card 2: Total Dana Disalurkan */}
            <div
              onClick={() => setShowEditModal(true)}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Total Dana Disalurkan</p>
                <div className="space-y-0.5">
                  <p className="font-serif text-2xl font-bold text-gray-900 leading-tight">Rp</p>
                  <p className="font-serif text-2xl font-bold text-gray-900 tracking-tight leading-none">
                    {formatRupiah(tersalurkanVal)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-normal mt-4">
                {pengajuanDisetujui} Pengajuan disetujui
              </p>
            </div>

            {/* Card 3: Dana Tersedia */}
            <div
              onClick={() => setShowEditModal(true)}
              className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group"
            >
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">Dana Tersedia</p>
                <div className="space-y-0.5">
                  <p className="font-serif text-2xl font-bold text-[#006b2b] leading-tight">Rp</p>
                  <p className="font-serif text-2xl font-bold text-[#006b2b] tracking-tight leading-none">
                    {formatRupiah(kuotaVal)}
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-500 font-normal mt-4">
                Siap disalurkan
              </p>
            </div>
          </div>

          {/* 2 Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
            {/* Left: Alokasi Dana */}
            <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Alokasi Dana</h2>
                <p className="text-xs text-gray-400 mt-0.5">Distribusi total infaq saat ini</p>
              </div>

              <div className="relative my-6 mx-auto w-[220px] h-[220px]">
                <Doughnut data={doughnutData} options={doughnutOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-serif text-2xl font-bold text-gray-900 leading-tight">
                    {formatRupiahShort(baseForPct)}
                  </span>
                  <span className="text-[11px] text-gray-500 font-normal mt-0.5">Total Dana</span>
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-gray-100/80">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#006b2b]" />
                    <span className="text-gray-700 font-medium">Tersalurkan</span>
                  </div>
                  <span className="font-bold text-gray-900">{tersalurkanPct}%</span>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                    <span className="text-gray-700 font-medium">Tersedia</span>
                  </div>
                  <span className="font-bold text-gray-900">{tersediaPct}%</span>
                </div>
              </div>
            </div>

            {/* Right: Tren Penyaluran Dana */}
            <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h2 className="text-base font-bold text-gray-900">Tren Penyaluran Dana</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Pencairan per bulan (Juta Rupiah)</p>
                </div>
              </div>

              <div className="w-full h-[280px] sm:h-[300px] mt-4">
                <Line data={lineData} options={lineOptions} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DATA PEMINJAM & VERIFIKASI SETORAN (DENGAN EXPORT PER USER)        */}
      {/* ========================================================================= */}
      {adminSection === 'peminjam' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-900">
                Daftar Peminjam &amp; Verifikasi Mutasi Setoran
              </h2>
              <p className="text-xs text-gray-500">
                Tinjau bukti transfer, ubah status verifikasi, dan lakukan <strong>Export Status Pinjaman Per User</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-xl">
                {lunasCount} Lunas
              </span>
              <span className="text-xs bg-amber-100 text-amber-800 font-bold px-3 py-1.5 rounded-xl">
                {unpaidCount} Belum Lunas
              </span>
            </div>
          </div>

          {/* Table of Borrowers */}
          <div className="bg-white rounded-2xl border border-gray-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-700">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 uppercase font-bold">
                  <tr>
                    <th className="py-3 px-4">Peminjam</th>
                    <th className="py-3 px-3">Peran / Unit</th>
                    <th className="py-3 px-3 text-right">Pinjaman</th>
                    <th className="py-3 px-3 text-right">Sudah Setor</th>
                    <th className="py-3 px-3 text-right">Sisa Tagihan</th>
                    <th className="py-3 px-3 text-center">Status</th>
                    <th className="py-3 px-4 text-center">Aksi / Export</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {borrowers.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-3 px-4">
                        <p className="font-bold text-gray-900 text-sm">{b.nama}</p>
                        <p className="text-[11px] font-mono text-gray-500">{b.identifier}</p>
                        <p className="text-[11px] text-gray-400">WA: {b.noWa}</p>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md bg-gray-100 font-semibold text-gray-700 text-[10px]">
                          {b.peran}
                        </span>
                        <p className="text-[11px] text-gray-500 mt-1 truncate max-w-[180px]">
                          {b.unitFakultas}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-right font-medium">
                        Rp {formatRupiah(b.totalPinjaman)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-[#006b2b]">
                        Rp {formatRupiah(b.calculation.totalSetor)}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-amber-700">
                        Rp {formatRupiah(b.calculation.sisaPinjaman)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                            b.calculation.isLunas
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {b.calculation.isLunas ? 'LUNAS' : 'BELUM LUNAS'}
                        </span>
                        {b.calculation.isLunas && b.calculation.retentionDaysLeft !== null && (
                          <span className="block text-[9px] text-gray-400 mt-0.5">
                            Retensi: {b.calculation.retentionDaysLeft} hari
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {/* Export PDF per user button */}
                          <Link
                            href={`/program/pinjaman-tanpa-syarat-pintas/export/${b.identifier}`}
                            target="_blank"
                            className="px-3 py-1.5 bg-[#006b2b] hover:bg-[#005522] text-white font-bold text-[11px] rounded-lg transition-colors shadow-2xs"
                            title="Export PDF Surat Keterangan Khusus Peminjam Ini"
                          >
                            Export PDF
                          </Link>

                          {/* Portal View */}
                          <Link
                            href={`/program/pinjaman-tanpa-syarat-pintas/setoran?user=${b.identifier}`}
                            target="_blank"
                            className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-[11px] font-semibold rounded-lg transition-colors"
                            title="Buka Portal Setoran"
                          >
                            Buka Portal
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Sub-section: Rincian Riwayat Semua Mutasi Setoran */}
          <div className="bg-white rounded-2xl border border-gray-200/80 p-5 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-gray-900">
              Semua Mutasi Setoran &amp; Verifikasi Bukti Transfer
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-bold">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Peminjam</th>
                    <th className="py-2.5 px-3">Nominal</th>
                    <th className="py-2.5 px-3">Bukti Transfer</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Aksi Verifikasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {borrowers.flatMap((b) =>
                    b.setoran.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="py-2.5 px-3 font-medium text-gray-600">
                          {formatDate(s.tanggalSetor)}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-bold text-gray-900 block">{b.nama}</span>
                          <span className="text-[10px] text-gray-400 font-mono">{b.identifier}</span>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#006b2b]">
                          Rp {formatRupiah(s.nominal)}
                        </td>
                        <td className="py-2.5 px-3">
                          {s.buktiPurged ? (
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                              Dibersihkan (&gt;30 hari lunas)
                            </span>
                          ) : s.buktiTransferUrl ? (
                            <button
                              onClick={() => setPreviewBuktiModal(s.buktiTransferUrl)}
                              className="text-[#006b2b] font-bold text-[11px] hover:underline"
                            >
                              Lihat Bukti
                            </button>
                          ) : (
                            <span className="text-gray-400 italic">Tidak ada berkas</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              s.status === 'TERVERIFIKASI'
                                ? 'bg-emerald-100 text-emerald-800'
                                : s.status === 'DITOLAK'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {s.status === 'MENUNGGU_VERIFIKASI' ? (
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleVerifySetoran(b.id, s.id, 'TERVERIFIKASI')}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-md text-[10px] font-bold hover:bg-emerald-700"
                              >
                                Verifikasi
                              </button>
                              <button
                                onClick={() => handleVerifySetoran(b.id, s.id, 'DITOLAK')}
                                className="px-2.5 py-1 bg-red-600 text-white rounded-md text-[10px] font-bold hover:bg-red-700"
                              >
                                Tolak
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-gray-400">Selesai</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PENGINGAT AWAL BULAN (NOTIFIKASI WHATSAPP)                         */}
      {/* ========================================================================= */}
      {adminSection === 'pengingat' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#006b2b]">
                  Jadwal Otomatis: Setiap Tanggal 1 Awal Bulan Pukul 08:00 WIB
                </span>
                <h2 className="text-base sm:text-lg font-black text-gray-900 mt-0.5">
                  Notifikasi Pengingat Bayar PINTAS via WhatsApp
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sistem mengecek seluruh peminjam yang belum berstatus lunas dan mengirimkan rincian sisa tagihan secara berkala.
                </p>
              </div>

              <button
                onClick={() => handleTriggerReminders()}
                disabled={actionLoading}
                className="px-5 py-2.5 bg-[#006b2b] hover:bg-[#005522] text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
              >
                {actionLoading ? 'Mengirim...' : 'Jalankan Pengingat Sekarang (Semua Belum Lunas)'}
              </button>
            </div>

            {/* List Peminjam yang Belum Lunas */}
            <div className="mt-5">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
                Daftar Peminjam Belum Lunas ({unpaidCount} Orang)
              </h3>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-2xl overflow-hidden">
                {borrowers
                  .filter((b) => !b.calculation.isLunas)
                  .map((b) => {
                    const waText = encodeURIComponent(
                      `Assalamu'alaikum Sdr/i ${b.nama}. Pengingat setoran PINTAS Rumah Amal USK untuk bulan ini. Sisa pinjaman Anda: Rp ${formatRupiah(
                        b.calculation.sisaPinjaman
                      )}. Rekening BSI: 7082305587. Portal Setoran: https://rumahamal.usk.ac.id/program/pinjaman-tanpa-syarat-pintas/setoran?user=${b.identifier}`
                    );

                    return (
                      <div
                        key={b.id}
                        className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 text-sm">{b.nama}</span>
                            <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded text-gray-700">
                              {b.peran}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-0.5">
                            {b.identifier} • WA: {b.noWa}
                          </p>
                          <p className="text-xs text-amber-700 font-bold mt-1">
                            Sisa Pinjaman: Rp {formatRupiah(b.calculation.sisaPinjaman)}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTriggerReminders(b.id)}
                            className="px-3.5 py-1.5 bg-gray-800 hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors"
                          >
                            Kirim via Gateway
                          </button>

                          <a
                            href={`https://api.whatsapp.com/send/?phone=${b.noWa}&text=${waText}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3.5 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5 shadow-2xs"
                          >
                            <span>Chat WA Langsung</span>
                          </a>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Riwayat Log Pengingat Terkirim */}
            <div className="mt-8 pt-5 border-t border-gray-100">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700 mb-3">
                Log Pengingat yang Pernah Dikirim
              </h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {reminderLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl bg-gray-50 border border-gray-100 text-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <span className="font-bold text-gray-900">{log.borrowerName}</span> ({log.identifier})
                      <span className="text-gray-500 block text-[11px] mt-0.5">
                        Periode: {log.bulan} • Sisa: Rp {formatRupiah(log.sisaPinjaman)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                        {log.status}
                      </span>
                      <span className="text-[10px] text-gray-400 block mt-0.5">
                        {formatDate(log.sentAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: RETENSI BERKAS LUNAS & AUTO-PURGE 30 HARI                          */}
      {/* ========================================================================= */}
      {adminSection === 'retensi' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                  Optimalisasi Server &amp; Pengamanan Data
                </span>
                <h2 className="text-base sm:text-lg font-black text-gray-900 mt-0.5">
                  Kebijakan Retensi Berkas Pembayaran (30 Hari Pasca Lunas)
                </h2>
                <p className="text-xs text-gray-600 mt-1 max-w-2xl leading-relaxed">
                  Sesuai permintaan sistem: apabila peminjam sudah berstatus <strong>LUNAS</strong>, bukti fisik pembayaran dihapus secara otomatis dalam estimasi <strong>30 hari</strong> demi efisiensi server. Sebelum dihapus, pastikan berkas diamankan melalui fitur export per user. Data akuntansi finansial tetap tersimpan permanen.
                </p>
              </div>

              <button
                onClick={handleTriggerAutoPurge}
                disabled={actionLoading}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
              >
                {actionLoading ? 'Membersihkan...' : 'Jalankan Pembersihan Berkas (>30 Hari)'}
              </button>
            </div>

            {/* List Peminjam Lunas dan status retensi */}
            <div className="mt-5 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">
                Status Retensi Peminjam Lunas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {borrowers
                  .filter((b) => b.calculation.isLunas)
                  .map((b) => (
                    <div
                      key={b.id}
                      className="p-5 rounded-2xl border bg-gray-50 border-gray-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-gray-900 text-sm">{b.nama}</span>
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                            Lunas: {formatDate(b.lunasAt)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-mono">{b.identifier}</p>
                        <p className="text-xs text-gray-600 mt-1">
                          Total Pinjaman Telah Selesai: <strong>Rp {formatRupiah(b.totalPinjaman)}</strong>
                        </p>

                        <div className="mt-3 p-3 rounded-xl bg-white border border-gray-200 text-xs">
                          {b.calculation.isPurged ? (
                            <span className="text-amber-800 font-semibold flex items-center gap-1.5">
                              <span>🗑️</span> Berkas bukti transfer telah dibersihkan otomatis (&gt;30 hari).
                            </span>
                          ) : (
                            <span className="text-emerald-800 font-semibold flex items-center gap-1.5">
                              <span>⏳</span> Sisa masa retensi: <strong>{b.calculation.retentionDaysLeft} hari</strong> lagi sebelum berkas dihapus otomatis.
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-200 flex items-center justify-end">
                        <Link
                          href={`/program/pinjaman-tanpa-syarat-pintas/export/${b.identifier}`}
                          target="_blank"
                          className="px-4 py-2 bg-[#006b2b] hover:bg-[#005522] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
                        >
                          Export Surat Lunas (PDF)
                        </Link>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: INTEGRASI GOOGLE FORM & WA ADMIN                                   */}
      {/* ========================================================================= */}
      {adminSection === 'alur_gform' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-200/80 p-6 shadow-sm space-y-5">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#006b2b]">
                Panduan Integrasi WhatsApp &amp; Google Form
              </span>
              <h2 className="text-base sm:text-lg font-black text-gray-900 mt-0.5">
                Alur Pendaftaran &amp; Notifikasi Google Form ke WhatsApp Admin
              </h2>
              <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                Menjawab kebutuhan: <em>&ldquo;Apabila sudah mendaftar melalui gform apa bisa memberi notifikasi kepada admin melalui WA?&rdquo;</em>
                <br />
                <strong>YA, TENTU BISA!</strong> Terdapat 2 metode yang telah diaktifkan:
              </p>
            </div>

            {/* Metode 1 */}
            <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2">
              <h3 className="text-xs font-black uppercase text-emerald-950 flex items-center gap-1.5">
                <span>1️⃣</span> Metode 1: Tombol Konfirmasi Instan di Website (Sudah Aktif)
              </h3>
              <p className="text-xs text-emerald-900 leading-relaxed">
                Di halaman publik PINTAS, pendaftar yang telah mengisi Google Form dapat langsung mengklik tombol <strong>&ldquo;Konfirmasi Pendaftaran ke Admin via WhatsApp&rdquo;</strong>. Tombol ini otomatis membuka WhatsApp Admin Rumah Amal ({noWaAdmin}) dengan format pesan lengkap.
              </p>
            </div>

            {/* Metode 2: Google Apps Script Webhook */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-200 space-y-3">
              <h3 className="text-xs font-black uppercase text-gray-900 flex items-center gap-1.5">
                <span>2️⃣</span> Metode 2: Webhook Otomatis di Google Form (Google Apps Script)
              </h3>
              <p className="text-xs text-gray-600 leading-relaxed">
                Bila ingin notifikasi terkirim <strong>100% otomatis tanpa pendaftar membuka WA</strong>, cukup pasang skrip Google Apps Script berikut di formulir Google Form Rumah Amal:
              </p>

              <pre className="p-3 bg-gray-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto leading-relaxed">
{`// Buka Google Form -> Titik Tiga (Opsi) -> Script Editor (Apps Script)
// Tempelkan kode ini dan pasang Trigger pada onFormSubmit:

function onFormSubmit(e) {
  var itemResponses = e.response.getItemResponses();
  var nama = itemResponses[0].getResponse();
  var peran = itemResponses[1].getResponse();
  var noHp = itemResponses[2].getResponse();

  var pesan = "🚨 NOTIFIKASI PINTAS BARU!\\n" +
              "Ada pendaftar baru melalui Google Form:\\n" +
              "• Nama: " + nama + "\\n" +
              "• Peran: " + peran + "\\n" +
              "• Kontak: " + noHp + "\\n" +
              "Silakan cek berkas di Drive Rumah Amal USK.";

  // Kirim ke WhatsApp Gateway Rumah Amal USK
  UrlFetchApp.fetch("http://localhost:3001/send-message", {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({
      phone: "${noWaAdmin}",
      message: pesan
    })
  });
}`}
              </pre>
            </div>

            {/* Tautan Berkas & Formulir */}
            <div className="pt-3 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-800 block mb-1">
                  Kategori Mahasiswa
                </span>
                <p className="text-[11px] text-gray-500 mb-2">
                  Drive: {linkDownloadMahasiswa}
                  <br />
                  GForm: {linkGformMahasiswa}
                </p>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-xs font-bold text-[#006b2b] hover:underline"
                >
                  Ubah Tautan Mahasiswa →
                </button>
              </div>

              <div className="p-4 rounded-xl border border-gray-200">
                <span className="text-xs font-bold text-gray-800 block mb-1">
                  Kategori Dosen &amp; Staff USK
                </span>
                <p className="text-[11px] text-gray-500 mb-2">
                  Drive: {linkDownloadDosenStaff}
                  <br />
                  GForm: {linkGformDosenStaff}
                </p>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-xs font-bold text-[#006b2b] hover:underline"
                >
                  Ubah Tautan Dosen/Staff →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL PREVIEW BUKTI TRANSFER                                              */}
      {/* ========================================================================= */}
      {previewBuktiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <h4 className="text-sm font-bold text-gray-900">Bukti Transfer Pembayaran</h4>
              <button
                onClick={() => setPreviewBuktiModal(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center bg-gray-100 rounded-2xl p-2">
              <img
                src={previewBuktiModal}
                alt="Bukti Transfer"
                className="max-h-[60vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL EDIT DATA DANA & KONTEN                                             */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Kelola Data &amp; Dana PINTAS</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sesuaikan jumlah dana dan tautan resmi formulir PINTAS
                </p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Quick Action Presets */}
            <div className="mt-4 flex items-center justify-between bg-emerald-50/70 border border-emerald-100 p-3 rounded-2xl">
              <span className="text-xs text-emerald-800 font-medium">
                Gunakan angka default Gambar 2 (1.25 M, 850.5 Jt, 249.5 Jt):
              </span>
              <button
                onClick={setPresetImage2}
                className="px-3 py-1.5 bg-[#006b2b] hover:bg-[#005522] text-white text-xs font-bold rounded-xl transition-all shadow-sm shrink-0"
              >
                Terapkan Preset Gambar 2
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 mt-5 p-1 bg-gray-100 rounded-xl w-fit">
              <button
                onClick={() => setActiveTab('dana')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'dana' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Nominal Dana &amp; Statistik
              </button>
              <button
                onClick={() => setActiveTab('konten')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'konten' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                Konten &amp; Tautan Formulir
              </button>
            </div>

            {/* Form Tab 1: Dana */}
            {activeTab === 'dana' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Infaq Terkumpul (Rp)
                    </label>
                    <input
                      type="number"
                      value={infaqMasuk}
                      onChange={(e) => setInfaqMasuk(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Preview: Rp {formatRupiah(Number(infaqMasuk) || 0)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Dana Disalurkan (Rp)
                    </label>
                    <input
                      type="number"
                      value={tersalurkan}
                      onChange={(e) => setTersalurkan(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Preview: Rp {formatRupiah(Number(tersalurkan) || 0)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Dana Tersedia / Kuota (Rp)
                    </label>
                    <input
                      type="number"
                      value={kuotaTersedia}
                      onChange={(e) => setKuotaTersedia(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Preview: Rp {formatRupiah(Number(kuotaTersedia) || 0)}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Pengajuan Disetujui
                    </label>
                    <input
                      type="number"
                      value={pengajuanDisetujui}
                      onChange={(e) => setPengajuanDisetujui(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Form Tab 2: Konten */}
            {activeTab === 'konten' && (
              <div className="mt-5 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Definisi Program PINTAS
                  </label>
                  <textarea
                    value={definisi}
                    onChange={(e) => setDefinisi(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Link Berkas Mahasiswa (Drive)
                    </label>
                    <input
                      type="url"
                      value={linkDownloadMahasiswa}
                      onChange={(e) => setLinkDownloadMahasiswa(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Link Berkas Dosen &amp; Staff (Drive)
                    </label>
                    <input
                      type="url"
                      value={linkDownloadDosenStaff}
                      onChange={(e) => setLinkDownloadDosenStaff(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Link Google Form Mahasiswa
                    </label>
                    <input
                      type="url"
                      value={linkGformMahasiswa}
                      onChange={(e) => setLinkGformMahasiswa(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Link Google Form Dosen &amp; Staff
                    </label>
                    <input
                      type="url"
                      value={linkGformDosenStaff}
                      onChange={(e) => setLinkGformDosenStaff(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Nomor WhatsApp Admin (Notifikasi)
                    </label>
                    <input
                      type="text"
                      value={noWaAdmin}
                      onChange={(e) => setNoWaAdmin(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                      placeholder="628116888123"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Link Informasi WhatsApp
                    </label>
                    <input
                      type="url"
                      value={linkInformasi}
                      onChange={(e) => setLinkInformasi(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Save & Feedback */}
            <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-between">
              {saveMsg ? (
                <span
                  className={`text-xs font-bold ${
                    saveMsg.startsWith('✓') ? 'text-emerald-700' : 'text-red-600'
                  }`}
                >
                  {saveMsg}
                </span>
              ) : (
                <span className="text-[11px] text-gray-400">
                  Perubahan akan langsung sinkron dengan halaman publik user.
                </span>
              )}

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors"
                >
                  Batal
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 bg-[#006b2b] hover:bg-[#005522] text-white text-xs font-bold rounded-xl shadow transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
