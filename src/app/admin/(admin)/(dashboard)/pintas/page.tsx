'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Doughnut, Line } from 'react-chartjs-2';
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
  definisi: string | null;
  syaratAdmin: string | null;
  alurPendaftaran: string | null;
  linkDownload: string | null;
  linkInformasi: string | null;
  updatedAt: string;
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

  // Form states
  const [kuotaTersedia, setKuotaTersedia] = useState('249500000');
  const [infaqMasuk, setInfaqMasuk] = useState('1250000000');
  const [tersalurkan, setTersalurkan] = useState('850500000');
  const [dicadangkan, setDicadangkan] = useState('150000000');
  const [pengajuanDisetujui, setPengajuanDisetujui] = useState('425');
  const [pengajuanProses, setPengajuanProses] = useState('75');
  const [definisi, setDefinisi] = useState('');
  const [syaratAdmin, setSyaratAdmin] = useState('');
  const [alurPendaftaran, setAlurPendaftaran] = useState('');
  const [linkDownload, setLinkDownload] = useState('https://bit.ly/berkaspintasRA');
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
        setDicadangkan(json.dicadangkan?.toString() || '150000000');
        setDefinisi(json.definisi || '');
        setSyaratAdmin(json.syaratAdmin || '');
        setAlurPendaftaran(json.alurPendaftaran || '');
        setLinkDownload(json.linkDownload || '');
        setLinkInformasi(json.linkInformasi || '');
      }
    } catch (err) {
      console.error('Error fetching PINTAS data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
          definisi,
          syaratAdmin,
          alurPendaftaran,
          linkDownload,
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

  const setPresetImage2 = () => {
    setInfaqMasuk('1250000000');
    setTersalurkan('850500000');
    setDicadangkan('150000000');
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 bg-white rounded-2xl h-96 border border-gray-200" />
          <div className="lg:col-span-7 bg-white rounded-2xl h-96 border border-gray-200" />
        </div>
      </div>
    );
  }

  // Values calculation
  const infaqMasukVal = data?.infaqMasuk ?? 1250000000;
  const tersalurkanVal = data?.tersalurkan ?? 850500000;
  const dicadangkanVal = data?.dicadangkan ?? 150000000;
  const kuotaVal = data?.kuotaTersedia ?? 249500000;

  const totalCalculated = tersalurkanVal + kuotaVal + dicadangkanVal;
  const baseForPct = totalCalculated > 0 ? totalCalculated : infaqMasukVal;

  const tersalurkanPct = baseForPct > 0 ? Math.round((tersalurkanVal / baseForPct) * 100) : 68;
  const tersediaPct = baseForPct > 0 ? Math.round((kuotaVal / baseForPct) * 100) : 20;
  const dicadangkanPct = baseForPct > 0 ? Math.round((dicadangkanVal / baseForPct) * 100) : 12;

  // Donut Chart Config
  const doughnutData = {
    labels: ['Tersalurkan', 'Tersedia', 'Dicadangkan'],
    datasets: [
      {
        data: [tersalurkanVal, kuotaVal, dicadangkanVal],
        backgroundColor: ['#006b2b', '#f59e0b', '#b6c4b8'],
        hoverBackgroundColor: ['#005522', '#d97706', '#9ca3af'],
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

  // Line Chart Config - Exactly matching Image 2 curve
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
        grid: {
          color: '#f1f5f9',
          drawTicks: false,
        },
        border: { display: false },
      },
      x: {
        ticks: {
          font: { size: 12, family: 'sans-serif' },
          color: '#6b7280',
          padding: 8,
        },
        grid: {
          display: false,
        },
        border: { display: false },
      },
    },
  };

  return (
    <div className="max-w-7xl mx-auto space-y-5 print:p-0 print:m-0" ref={printAreaRef}>
      {/* ========================================================================= */}
      {/* TOP BAR: Filter Tahun & Tombol Export (Sesuai Gambar 2)                  */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200/80 px-4 py-3 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 print:hidden">
        {/* Left: Tahun Selector Dropdown */}
        <div className="relative">
          <button
            onClick={() => setYearDropdownOpen(!yearDropdownOpen)}
            className="flex items-center gap-2.5 px-3.5 py-2 bg-gray-100 hover:bg-gray-200/80 rounded-xl text-xs sm:text-sm font-semibold text-gray-800 transition-colors border border-gray-200/60"
          >
            {/* Calendar Icon */}
            <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="16" y1="2" x2="16" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="8" y1="2" x2="8" y2="6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="3" y1="10" x2="21" y2="10" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Tahun Ini ({selectedYear})</span>
            {/* Chevron Icon */}
            <svg
              className={`w-3.5 h-3.5 text-gray-500 transition-transform ${yearDropdownOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Year Dropdown Menu */}
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

        {/* Right: Export Buttons + Admin Edit Button */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Export PDF Button */}
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-3.5 py-2 border border-[#006b2b] text-[#006b2b] hover:bg-emerald-50/70 rounded-xl text-xs sm:text-sm font-semibold transition-all active:scale-[0.98]"
          >
            {/* PDF icon with miniature 'PDF' badge */}
            <svg className="w-4 h-4 text-[#006b2b]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Export PDF</span>
          </button>


          {/* Kelola / Edit Dana Button for Admin */}
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#006b2b] hover:bg-[#005522] text-white rounded-xl text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            <span>Sesuaikan Dana & Konten</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4 STATS CARDS (Sesuai Gambar 2)                                          */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
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
            <p className="text-xs font-medium text-gray-500 mb-2">
              Total Dana <br />
              Disalurkan
            </p>
            <div className="space-y-0.5 mt-0.5">
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

        {/* Card 3: Dana Dicadangkan (Antrian) */}
        <div
          onClick={() => setShowEditModal(true)}
          className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group"
        >
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">
              Dana Dicadangkan <br />
              (Antrian)
            </p>
            <div className="space-y-0.5 mt-0.5">
              <p className="font-serif text-2xl font-bold text-gray-900 leading-tight">Rp</p>
              <p className="font-serif text-2xl font-bold text-gray-900 tracking-tight leading-none">
                {formatRupiah(dicadangkanVal)}
              </p>
            </div>
          </div>
          <p className="text-xs text-gray-500 font-normal mt-4">
            {pengajuanProses} Pengajuan dalam proses
          </p>
        </div>

        {/* Card 4: Dana Tersedia */}
        <div
          onClick={() => setShowEditModal(true)}
          className="bg-white rounded-2xl border border-gray-200/80 p-5 sm:p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between cursor-pointer hover:shadow-md transition-shadow group"
        >
          <div>
            <p className="text-xs font-medium text-gray-500 mb-2">Dana Tersedia</p>
            <div className="space-y-0.5 mt-3">
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

      {/* ========================================================================= */}
      {/* 2 CHARTS: Alokasi Dana (Donut) & Tren Penyaluran (Line)                  */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5">
        {/* Left: Alokasi Dana (Donut Chart) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Alokasi Dana</h2>
            <p className="text-xs text-gray-400 mt-0.5">Distribusi total infaq saat ini</p>
          </div>

          {/* Donut with Center Text */}
          <div className="relative my-6 mx-auto w-[220px] h-[220px]">
            <Doughnut data={doughnutData} options={doughnutOptions} />
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="font-serif text-2xl font-bold text-gray-900 leading-tight">
                {formatRupiahShort(baseForPct)}
              </span>
              <span className="text-[11px] text-gray-500 font-normal mt-0.5">Total Dana</span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="space-y-2.5 pt-2 border-t border-gray-100/80">
            {/* Tersalurkan */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#006b2b]" />
                <span className="text-gray-700 font-medium">Tersalurkan</span>
              </div>
              <span className="font-bold text-gray-900">{tersalurkanPct}%</span>
            </div>

            {/* Tersedia */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]" />
                <span className="text-gray-700 font-medium">Tersedia</span>
              </div>
              <span className="font-bold text-gray-900">{tersediaPct}%</span>
            </div>

            {/* Dicadangkan */}
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#b6c4b8]" />
                <span className="text-gray-700 font-medium">Dicadangkan</span>
              </div>
              <span className="font-bold text-gray-900">{dicadangkanPct}%</span>
            </div>
          </div>
        </div>

        {/* Right: Tren Penyaluran Dana (Line Chart) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-200/80 p-6 shadow-[0_1px_3px_rgba(0,0,0,0.03)] flex flex-col justify-between">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-base font-bold text-gray-900">Tren Penyaluran Dana</h2>
              <p className="text-xs text-gray-400 mt-0.5">Pencairan per bulan (Juta Rupiah)</p>
            </div>
            {/* 3 Dots Menu Button */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-gray-400 hover:text-gray-700 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                title="Opsi grafik"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-lg border border-gray-100 py-1.5 z-20">
                  <button
                    onClick={() => {
                      setShowEditModal(true);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>✏️</span> Edit Data Dana
                  </button>
                  <button
                    onClick={() => {
                      handleExportPdf();
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <span>📄</span> Export PDF
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Area Line Chart */}
          <div className="w-full h-[280px] sm:h-[300px] mt-4">
            <Line data={lineData} options={lineOptions} />
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL EDIT DATA DANA & KONTEN (Untuk Admin Mengatur Nilai)                 */}
      {/* ========================================================================= */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900">Kelola Data & Dana PINTAS</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sesuaikan jumlah dana dan informasi yang akan tampil di halaman publik
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
                Gunakan angka default sesuai Gambar 2 (1.25 Milyar, 850.5 Jt, 150 Jt, 249.5 Jt):
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
                💰 Nominal Dana & Statistik
              </button>
              <button
                onClick={() => setActiveTab('konten')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'konten' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                📝 Konten & Persyaratan
              </button>
            </div>

            {/* Form Tab 1: Dana */}
            {activeTab === 'dana' && (
              <div className="mt-5 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Total Infaq Terkumpul */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Infaq Terkumpul (Rp)
                    </label>
                    <input
                      type="number"
                      value={infaqMasuk}
                      onChange={(e) => setInfaqMasuk(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                      placeholder="1250000000"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Preview: Rp {formatRupiah(Number(infaqMasuk) || 0)}
                    </span>
                  </div>

                  {/* Total Dana Disalurkan */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Total Dana Disalurkan (Rp)
                    </label>
                    <input
                      type="number"
                      value={tersalurkan}
                      onChange={(e) => setTersalurkan(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                      placeholder="850500000"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Preview: Rp {formatRupiah(Number(tersalurkan) || 0)}
                    </span>
                  </div>

                  {/* Dana Dicadangkan (Antrian) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Dana Dicadangkan / Antrian (Rp)
                    </label>
                    <input
                      type="number"
                      value={dicadangkan}
                      onChange={(e) => setDicadangkan(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                      placeholder="150000000"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Preview: Rp {formatRupiah(Number(dicadangkan) || 0)}
                    </span>
                  </div>

                  {/* Dana Tersedia */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Dana Tersedia / Kuota (Rp)
                    </label>
                    <input
                      type="number"
                      value={kuotaTersedia}
                      onChange={(e) => setKuotaTersedia(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                      placeholder="249500000"
                    />
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      Preview: Rp {formatRupiah(Number(kuotaTersedia) || 0)}
                    </span>
                  </div>

                  {/* Pengajuan Disetujui */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Jumlah Pengajuan Disetujui
                    </label>
                    <input
                      type="number"
                      value={pengajuanDisetujui}
                      onChange={(e) => setPengajuanDisetujui(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                      placeholder="425"
                    />
                  </div>

                  {/* Pengajuan Dalam Proses */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Jumlah Pengajuan Dalam Proses
                    </label>
                    <input
                      type="number"
                      value={pengajuanProses}
                      onChange={(e) => setPengajuanProses(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                      placeholder="75"
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
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                    placeholder="Program bantuan pinjaman tanpa syarat (PINTAS)..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Syarat Administrasi (tiap baris satu syarat)
                  </label>
                  <textarea
                    value={syaratAdmin}
                    onChange={(e) => setSyaratAdmin(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                    placeholder="1. Surat Permohonan&#10;2. Surat Rekomendasi..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    Alur Pendaftaran
                  </label>
                  <textarea
                    value={alurPendaftaran}
                    onChange={(e) => setAlurPendaftaran(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                    placeholder="Mengunduh surat permohonan dan rekomendasi melalui link"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Link Download Berkas (Google Drive / Form)
                    </label>
                    <input
                      type="url"
                      value={linkDownload}
                      onChange={(e) => setLinkDownload(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                      placeholder="https://..."
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Link Informasi PINTAS
                    </label>
                    <input
                      type="url"
                      value={linkInformasi}
                      onChange={(e) => setLinkInformasi(e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#006b2b]/20 focus:border-[#006b2b]"
                      placeholder="https://..."
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
