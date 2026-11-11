'use client';

import { useEffect, useState, useTransition, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface SetoranItem {
  id: string;
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

interface BorrowerData {
  id: string;
  identifier: string;
  nama: string;
  peran: string;
  unitFakultas: string;
  noWa: string;
  email: string;
  rekeningPenerima: string;
  totalPinjaman: number;
  tanggalPencairan: string;
  tenggatWaktuBulan: number;
  status: string;
  lunasAt?: string | null;
  keteranganPinjaman: string;
  setoran: SetoranItem[];
  calculation: {
    totalSetor: number;
    totalPending: number;
    sisaPinjaman: number;
    isLunas: boolean;
    retentionDaysLeft: number | null;
    isPurged: boolean;
  };
}

function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0,
  }).format(value);
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
}

function PintasSetoranContent() {
  const searchParams = useSearchParams();
  const initialUser = searchParams?.get('user') || '2108107010001';

  const [searchIdentifier, setSearchIdentifier] = useState(initialUser);
  const [currentBorrower, setCurrentBorrower] = useState<BorrowerData | null>(null);
  const [allBorrowers, setAllBorrowers] = useState<BorrowerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isPending, startTransition] = useTransition();

  // Form Setoran states
  const [nominalSetor, setNominalSetor] = useState('');
  const [tanggalSetor, setTanggalSetor] = useState(new Date().toISOString().split('T')[0]);
  const [bankPengirim, setBankPengirim] = useState('BSI (Bank Syariah Indonesia)');
  const [noRekPengirim, setNoRekPengirim] = useState('');
  const [catatan, setCatatan] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState('');
  const [previewModalImg, setPreviewModalImg] = useState<string | null>(null);
  const [copiedRekening, setCopiedRekening] = useState(false);

  // Edit & Delete states
  const [editingItem, setEditingItem] = useState<SetoranItem | null>(null);
  const [editNominal, setEditNominal] = useState('');
  const [editTanggal, setEditTanggal] = useState('');
  const [editCatatan, setEditCatatan] = useState('');
  const [editBank, setEditBank] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleOpenEdit = (item: SetoranItem) => {
    setEditingItem(item);
    setEditNominal(item.nominal.toString());
    setEditTanggal(item.tanggalSetor);
    setEditCatatan(item.catatan || '');
    setEditBank(item.bankPengirim || '');
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBorrower || !editingItem) return;

    const nominalNum = Number(editNominal);
    if (!nominalNum || nominalNum <= 0) {
      alert('Masukkan nominal setoran yang valid.');
      return;
    }

    setEditSubmitting(true);
    try {
      const res = await fetch('/api/pintas/setoran', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerId: currentBorrower.id,
          setoranId: editingItem.id,
          nominal: nominalNum,
          tanggalSetor: editTanggal,
          catatan: editCatatan,
          bankPengirim: editBank,
        }),
      });

      if (res.ok) {
        setEditingItem(null);
        // Refresh data
        const refreshRes = await fetch(`/api/pintas/setoran?user=${currentBorrower.identifier}`);
        if (refreshRes.ok) {
          const updated = await refreshRes.json();
          setCurrentBorrower(updated);
        }
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Gagal mengubah data setoran.');
      }
    } catch (err) {
      console.error('Error update setoran:', err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteSetoran = async (setoranId: string) => {
    if (!currentBorrower) return;
    const confirmDelete = window.confirm('Apakah Anda yakin ingin menghapus data setoran ini?');
    if (!confirmDelete) return;

    setDeletingId(setoranId);
    try {
      const res = await fetch('/api/pintas/setoran', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerId: currentBorrower.id,
          setoranId,
        }),
      });

      if (res.ok) {
        const refreshRes = await fetch(`/api/pintas/setoran?user=${currentBorrower.identifier}`);
        if (refreshRes.ok) {
          const updated = await refreshRes.json();
          setCurrentBorrower(updated);
        }
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Gagal menghapus data setoran.');
      }
    } catch (err) {
      console.error('Error delete setoran:', err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setDeletingId(null);
    }
  };

  // Fetch all borrowers for static account selection
  useEffect(() => {
    async function loadData() {
      try {
        const res = await fetch('/api/pintas/setoran');
        if (res.ok) {
          const list: BorrowerData[] = await res.json();
          setAllBorrowers(list);
          const found =
            list.find((b) => b.identifier === searchIdentifier || b.id === searchIdentifier) ||
            list[0];
          if (found) {
            setCurrentBorrower(found);
          }
        }
      } catch (err) {
        console.error('Error fetching borrowers:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [searchIdentifier]);

  const handleSelectStaticAccount = (identifier: string) => {
    setSearchIdentifier(identifier);
    const found = allBorrowers.find((b) => b.identifier === identifier);
    if (found) {
      setCurrentBorrower(found);
      setErrorMsg('');
      setSubmitSuccess('');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchIdentifier.trim()) return;
    const found = allBorrowers.find(
      (b) =>
        b.identifier.toLowerCase() === searchIdentifier.trim().toLowerCase() ||
        b.nama.toLowerCase().includes(searchIdentifier.trim().toLowerCase())
    );
    if (found) {
      setCurrentBorrower(found);
      setErrorMsg('');
    } else {
      setErrorMsg(`Peminjam dengan NPM/NIP "${searchIdentifier}" tidak ditemukan.`);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCopyRekening = () => {
    navigator.clipboard.writeText('7082305587');
    setCopiedRekening(true);
    setTimeout(() => setCopiedRekening(false), 2000);
  };

  const handleSubmitSetoran = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentBorrower) return;

    const nominalNum = Number(nominalSetor.replace(/\D/g, ''));
    if (!nominalNum || nominalNum <= 0) {
      alert('Masukkan nominal setoran yang valid.');
      return;
    }

    if (!filePreview && !uploadFile) {
      alert('Silakan upload bukti transfer pembayaran.');
      return;
    }

    setSubmitting(true);
    setSubmitSuccess('');

    try {
      let finalBuktiUrl = filePreview;

      // Coba upload ke Supabase via /api/upload jika ada file objek asli
      if (uploadFile) {
        try {
          const form = new FormData();
          form.append('file', uploadFile);
          form.append('bucket', 'Dokumen');
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            body: form,
          });
          if (uploadRes.ok) {
            const upJson = await uploadRes.json();
            if (upJson.url) {
              finalBuktiUrl = upJson.url;
            }
          }
        } catch (e) {
          console.warn('Fallback using base64 preview for proof:', e);
        }
      }

      const res = await fetch('/api/pintas/setoran', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerId: currentBorrower.id,
          nominal: nominalNum,
          tanggalSetor,
          metode: `Transfer ke Rekening BSI PINTAS USK (7082305587)`,
          bankPengirim,
          nomorRekeningPengirim: noRekPengirim,
          namaPengirim: currentBorrower.nama,
          buktiTransferUrl: finalBuktiUrl,
          buktiFileName: uploadFile?.name || 'bukti_transfer.jpg',
          catatan,
        }),
      });

      if (res.ok) {
        setSubmitSuccess('✓ Setoran berhasil dikirim dan diverifikasi!');
        setNominalSetor('');
        setCatatan('');
        setUploadFile(null);
        setFilePreview(null);

        // Refresh borrower data
        const refreshRes = await fetch(`/api/pintas/setoran?user=${currentBorrower.identifier}`);
        if (refreshRes.ok) {
          const updated = await refreshRes.json();
          setCurrentBorrower(updated);
        }
      } else {
        const errJson = await res.json();
        alert(errJson.error || 'Gagal mengirim setoran.');
      }
    } catch (err) {
      console.error('Submit setoran error:', err);
      alert('Terjadi kesalahan jaringan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#fafbfc] font-sans text-gray-800 pb-16">
      {/* Top Banner / Breadcrumb */}
      <div className="bg-white border-b border-gray-200/90 py-5 px-4 sm:px-6">
        <div className="max-w-[1000px] mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <Link
              href="/program/pinjaman-tanpa-syarat-pintas"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b6330] hover:underline mb-1"
            >
              ← Kembali ke Informasi Program PINTAS
            </Link>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Portal Setoran &amp; Pengembalian PINTAS
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Setorkan dana pengembalian pinjaman tanpa bunga sesuai nominal peminjaman Anda.
            </p>
          </div>

          {currentBorrower && (
            <Link
              href={`/program/pinjaman-tanpa-syarat-pintas/export/${currentBorrower.identifier}`}
              target="_blank"
              className="flex items-center justify-center px-4 py-2.5 bg-[#0b6330] hover:bg-[#084e26] text-white text-xs font-bold rounded-xl shadow-sm transition-all active:scale-[0.98] shrink-0"
            >
              <span>Export Dokumen Pinjaman (PDF)</span>
            </Link>
          )}
        </div>
      </div>

      <main className="max-w-[1000px] mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        {/* ========================================================================= */}
        {/* BOX 1: AKUN STATIS SELECTOR (Sesuai Permintaan Akun Statis Namun Efektif) */}
        {/* ========================================================================= */}
        <div className="bg-white rounded-3xl border border-gray-200/80 p-5 sm:p-6 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#0b6330] block">
                Mode Uji Coba Cepat (Akun Statis)
              </span>
              <h2 className="text-sm sm:text-base font-bold text-gray-900">
                Pilih Akun Peminjam atau Cari berdasarkan NPM / NIP
              </h2>
            </div>
            {/* Search Input */}
            <form onSubmit={handleSearch} className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Cari NPM / NIP..."
                value={searchIdentifier}
                onChange={(e) => setSearchIdentifier(e.target.value)}
                className="px-3.5 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-gray-800 text-white text-xs font-bold rounded-xl hover:bg-black transition-colors"
              >
                Cari
              </button>
            </form>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {errorMsg}
            </div>
          )}

          {/* Quick Select Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {allBorrowers.map((b) => {
              const isSelected = currentBorrower?.identifier === b.identifier;
              const isLunas = b.status === 'LUNAS';

              return (
                <button
                  key={b.id}
                  onClick={() => handleSelectStaticAccount(b.identifier)}
                  className={`text-left p-3 rounded-2xl border transition-all ${
                    isSelected
                      ? 'border-[#0b6330] bg-emerald-50/70 shadow-sm ring-2 ring-[#0b6330]/20'
                      : 'border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-700">
                      {b.peran}
                    </span>
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isLunas ? 'bg-emerald-200 text-emerald-900' : 'bg-amber-100 text-amber-900'
                      }`}
                    >
                      {isLunas ? 'Lunas' : 'Belum Lunas'}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-gray-900 truncate">{b.nama}</p>
                  <p className="text-[11px] font-mono text-gray-500">{b.identifier}</p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Pinjaman: <span className="font-semibold">Rp {formatRupiah(b.totalPinjaman)}</span>
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {loading ? (
          <div className="animate-pulse space-y-4">
            <div className="h-44 bg-white rounded-3xl border border-gray-200" />
            <div className="h-64 bg-white rounded-3xl border border-gray-200" />
          </div>
        ) : currentBorrower ? (
          <>
            {/* ========================================================================= */}
            {/* BOX 2: STATUS PINJAMAN & SUMMARY CARD                                     */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 pb-6 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h2 className="text-lg sm:text-xl font-black text-gray-900">
                      {currentBorrower.nama}
                    </h2>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-[#0b6330] font-bold">
                      {currentBorrower.peran}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-mono">
                    NPM/NIP: <span className="font-bold text-gray-700">{currentBorrower.identifier}</span> •{' '}
                    {currentBorrower.unitFakultas}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    Tujuan: <span className="italic">{currentBorrower.keteranganPinjaman}</span>
                  </p>
                </div>

                {/* Status Lunas Badge & Retention Info */}
                <div className="flex flex-col items-start md:items-end">
                  <span
                    className={`text-xs sm:text-sm font-black px-3.5 py-1 rounded-full ${
                      currentBorrower.calculation.isLunas
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {currentBorrower.calculation.isLunas ? 'STATUS: LUNAS' : 'STATUS: BELUM LUNAS'}
                  </span>
                  {currentBorrower.calculation.isLunas && currentBorrower.lunasAt && (
                    <span className="text-[11px] text-gray-500 mt-1">
                      Lunas pada: {formatDate(currentBorrower.lunasAt)}
                    </span>
                  )}
                </div>
              </div>

              {/* 3 Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
                <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100">
                  <span className="text-xs text-gray-500 block mb-1">Total Pinjaman Akad</span>
                  <p className="text-lg sm:text-xl font-bold text-gray-900">
                    Rp {formatRupiah(currentBorrower.totalPinjaman)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
                  <span className="text-xs text-emerald-800 font-medium block mb-1">
                    Total Sudah Disetor
                  </span>
                  <p className="text-lg sm:text-xl font-bold text-[#0b6330]">
                    Rp {formatRupiah(currentBorrower.calculation.totalSetor)}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-100">
                  <span className="text-xs text-amber-900 font-medium block mb-1">
                    Sisa Tagihan Pinjaman
                  </span>
                  <p className="text-lg sm:text-xl font-bold text-amber-700">
                    Rp {formatRupiah(currentBorrower.calculation.sisaPinjaman)}
                  </p>
                </div>
              </div>

              {/* Progress Bar Pelunasan */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-gray-600 mb-2">
                  <span>Progres Pengembalian Dana</span>
                  <span>
                    {Math.round(
                      (currentBorrower.calculation.totalSetor / currentBorrower.totalPinjaman) * 100
                    )}
                    % Terbayar
                  </span>
                </div>
                <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0b6330] rounded-full transition-all duration-500"
                    style={{
                      width: `${Math.min(
                        100,
                        (currentBorrower.calculation.totalSetor / currentBorrower.totalPinjaman) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Notifikasi Lunas & Tombol Konfirmasi ke WhatsApp Rumah Amal */}
              {currentBorrower.calculation.isLunas && (
                <div className="mt-6 p-4 sm:p-5 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-emerald-950">
                      Pinjaman Anda Telah Lunas
                    </h4>
                    <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                      Alhamdulillah, seluruh kewajiban pinjaman Anda telah terselesaikan. Anda dapat langsung menginformasikan pelunasan ini ke pihak Rumah Amal USK via WhatsApp.
                    </p>
                  </div>
                  <a
                    href={`https://api.whatsapp.com/send/?phone=628116888123&text=${encodeURIComponent(
                      `Assalamu'alaikum Warahmatullahi Wabarakatuh Admin Rumah Amal USK,\n\nSaya ingin menginformasikan bahwa pinjaman PINTAS saya telah LUNAS dengan rincian berikut:\n• Nama: ${currentBorrower.nama}\n• NPM/NIP: ${currentBorrower.identifier}\n• Unit/Fakultas: ${currentBorrower.unitFakultas}\n• Total Pinjaman: Rp ${formatRupiah(currentBorrower.totalPinjaman)}\n• Total Setoran: Rp ${formatRupiah(currentBorrower.calculation.totalSetor)}\n• Sisa Pinjaman: Rp 0 (LUNAS)\n\nMohon konfirmasi pelunasan dan penerbitan bukti bebas tanggungan pinjaman. Terima kasih.\nWassalamu'alaikum Wr. Wb.`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 bg-[#0b6330] hover:bg-[#084e26] text-white text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-colors shadow-sm text-center"
                  >
                    Konfirmasi Lunas ke WhatsApp Rumah Amal
                  </a>
                </div>
              )}

              {/* Notice Kebijakan Retensi 30 Hari Bukti Pembayaran */}
              {currentBorrower.calculation.isLunas && (
                <div className="mt-4 p-4 rounded-2xl bg-gray-50 border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">
                      Kebijakan Retensi Berkas Bukti (30 Hari):
                    </h4>
                    <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                      {currentBorrower.calculation.isPurged
                        ? 'Bukti transfer fisik peminjam telah dibersihkan otomatis karena sudah melampaui 30 hari pasca pelunasan untuk mengoptimalkan ruang server. Data finansial tetap aman tercatat.'
                        : `Status pinjaman Anda telah Lunas. Sisa masa retensi bukti fisik: ${currentBorrower.calculation.retentionDaysLeft} hari lagi sebelum dihapus otomatis. Silakan export dan amankan rekap peminjaman Anda sekarang.`}
                    </p>
                  </div>
                  <Link
                    href={`/program/pinjaman-tanpa-syarat-pintas/export/${currentBorrower.identifier}`}
                    target="_blank"
                    className="px-4 py-2 bg-gray-800 hover:bg-black text-white text-xs font-bold rounded-xl whitespace-nowrap shrink-0 transition-colors shadow-sm"
                  >
                    Export Rekap (PDF)
                  </Link>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* BOX 3: FORM SETORAN BARU (BISA INPUT BUKTI TRANSFER)                      */}
            {/* ========================================================================= */}
            {!currentBorrower.calculation.isLunas && (
              <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-gray-900">
                      Formulir Input Setoran Pengembalian
                    </h3>
                    <p className="text-xs text-gray-500">
                      Kirimkan bukti transfer dan nominal setoran cicilan atau pelunasan Anda
                    </p>
                  </div>
                </div>

                {/* Rekening Tujuan Box */}
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider block">
                      Rekening Resmi Penampung PINTAS:
                    </span>
                    <p className="text-sm font-black text-gray-900 mt-0.5">
                      Bank Syariah Indonesia (BSI) — <span className="font-mono">7082305587</span>
                    </p>
                    <p className="text-xs text-emerald-800">a.n. Rumah Amal USK - PINTAS</p>
                  </div>
                  <button
                    onClick={handleCopyRekening}
                    type="button"
                    className="px-3.5 py-2 bg-white hover:bg-emerald-100 text-[#0b6330] border border-emerald-300 text-xs font-bold rounded-xl transition-colors shrink-0"
                  >
                    {copiedRekening ? 'Berhasil Disalin' : 'Salin Nomor Rekening'}
                  </button>
                </div>

                {submitSuccess && (
                  <div className="mb-5 p-3.5 bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl">
                    {submitSuccess}
                  </div>
                )}

                <form onSubmit={handleSubmitSetoran} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Nominal Setoran */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nominal Setoran (Rp) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        placeholder="Contoh: 1500000"
                        value={nominalSetor}
                        onChange={(e) => setNominalSetor(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
                      />
                      {/* Preset Buttons */}
                      <div className="flex gap-2 mt-2">
                        <button
                          type="button"
                          onClick={() =>
                            setNominalSetor(currentBorrower.calculation.sisaPinjaman.toString())
                          }
                          className="text-[11px] px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors"
                        >
                          Lunaskan Seluruhnya (Rp{' '}
                          {formatRupiah(currentBorrower.calculation.sisaPinjaman)})
                        </button>
                      </div>
                    </div>

                    {/* Tanggal Setor */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Tanggal Transfer <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={tanggalSetor}
                        onChange={(e) => setTanggalSetor(e.target.value)}
                        required
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
                      />
                    </div>

                    {/* Bank Pengirim */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Bank Pengirim
                      </label>
                      <input
                        type="text"
                        placeholder="BSI / Bank Aceh / Mandiri..."
                        value={bankPengirim}
                        onChange={(e) => setBankPengirim(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
                      />
                    </div>

                    {/* No Rek Pengirim */}
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Nomor Rekening Pengirim (Opsional)
                      </label>
                      <input
                        type="text"
                        placeholder="Nomor rekening pengirim"
                        value={noRekPengirim}
                        onChange={(e) => setNoRekPengirim(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
                      />
                    </div>
                  </div>

                  {/* Upload Bukti Transfer */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Upload Bukti Transfer / Resi Pembayaran{' '}
                      <span className="text-red-500">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-4 text-center hover:bg-gray-50 transition-colors">
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                        id="bukti-file-input"
                      />
                      <label htmlFor="bukti-file-input" className="cursor-pointer block">
                        <svg
                          className="w-8 h-8 text-gray-400 mx-auto mb-2"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="1.5"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        <span className="text-xs font-bold text-[#0b6330]">
                          Klik untuk memilih foto / scan bukti transfer
                        </span>
                        <span className="text-[11px] text-gray-400 block mt-0.5">
                          Format JPG, PNG, atau PDF (Maks. 5MB)
                        </span>
                      </label>

                      {filePreview && (
                        <div className="mt-3 flex items-center justify-center gap-3">
                          <img
                            src={filePreview}
                            alt="Preview Bukti"
                            className="w-24 h-24 object-cover rounded-xl border border-gray-200"
                          />
                          <div className="text-left">
                            <span className="text-xs font-semibold text-gray-800 block">
                              {uploadFile?.name || 'bukti_transfer.jpg'}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                setUploadFile(null);
                                setFilePreview(null);
                              }}
                              className="text-[11px] text-red-600 font-bold hover:underline mt-1"
                            >
                              Hapus File
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Catatan Tambahan */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Catatan / Keterangan (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Setoran cicilan ke-2 UKT..."
                      value={catatan}
                      onChange={(e) => setCatatan(e.target.value)}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
                    />
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 bg-[#0b6330] hover:bg-[#084e26] text-white text-xs sm:text-sm font-bold rounded-2xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50"
                    >
                      {submitting ? 'Memproses Setoran...' : 'Kirim Bukti & Catat Setoran'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ========================================================================= */}
            {/* BOX 4: TABEL RIWAYAT SETORAN                                              */}
            {/* ========================================================================= */}
            <div className="bg-white rounded-3xl border border-gray-200/80 p-6 sm:p-8 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base sm:text-lg font-black text-gray-900">
                    Riwayat Setoran Peminjam
                  </h3>
                  <p className="text-xs text-gray-500">
                    Daftar mutasi pengembalian dana pinjaman PINTAS
                  </p>
                </div>
                <span className="text-xs font-bold text-gray-600">
                  {currentBorrower.setoran.length} Transaksi
                </span>
              </div>

              {currentBorrower.setoran.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <p className="text-sm font-medium">Belum ada transaksi setoran yang dicatat.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50 text-gray-600 uppercase font-bold border-b border-gray-100">
                      <tr>
                        <th className="py-3 px-3">Tanggal</th>
                        <th className="py-3 px-3">Nominal</th>
                        <th className="py-3 px-3">Metode &amp; Catatan</th>
                        <th className="py-3 px-3">Bukti Transfer</th>
                        <th className="py-3 px-3 text-center">Status</th>
                        <th className="py-3 px-3 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {currentBorrower.setoran.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50/80 transition-colors">
                          <td className="py-3.5 px-3 font-semibold text-gray-900">
                            {formatDate(item.tanggalSetor)}
                          </td>
                          <td className="py-3.5 px-3 font-bold text-[#0b6330] text-sm">
                            Rp {formatRupiah(item.nominal)}
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="text-gray-900 block">{item.metode}</span>
                            {item.catatan && (
                              <span className="text-[11px] text-gray-500 italic mt-0.5 block">
                                Ket: {item.catatan}
                              </span>
                            )}
                          </td>
                          <td className="py-3.5 px-3">
                            {item.buktiPurged ? (
                              <span className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                Dihapus otomatis (&gt;30 hari lunas)
                              </span>
                            ) : item.buktiTransferUrl ? (
                              <button
                                type="button"
                                onClick={() => setPreviewModalImg(item.buktiTransferUrl)}
                                className="inline-flex items-center text-[11px] font-bold text-[#0b6330] hover:underline"
                              >
                                Lihat Bukti
                              </button>
                            ) : (
                              <span className="text-gray-400 italic text-[11px]">Tidak ada berkas</span>
                            )}
                          </td>
                          <td className="py-3.5 px-3 text-center">
                            <span
                              className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full ${
                                item.status === 'TERVERIFIKASI'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : item.status === 'DITOLAK'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                className="px-2.5 py-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                disabled={deletingId === item.id}
                                onClick={() => handleDeleteSetoran(item.id)}
                                className="px-2.5 py-1 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                              >
                                {deletingId === item.id ? 'Menghapus...' : 'Hapus'}
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>

      {/* Modal Preview Bukti Transfer */}
      {previewModalImg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-5 overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
              <h4 className="text-sm font-bold text-gray-900">Bukti Transfer Pembayaran</h4>
              <button
                onClick={() => setPreviewModalImg(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs"
              >
                ✕
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto flex items-center justify-center bg-gray-100 rounded-2xl p-2">
              <img
                src={previewModalImg}
                alt="Bukti Transfer"
                className="max-h-[60vh] w-auto object-contain rounded-xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Setoran */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 overflow-hidden shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
              <h4 className="text-base font-bold text-gray-900">Edit Riwayat Setoran</h4>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-7 h-7 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nominal Setoran (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={editNominal}
                  onChange={(e) => setEditNominal(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Tanggal Transfer <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={editTanggal}
                  onChange={(e) => setEditTanggal(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Bank Pengirim
                </label>
                <input
                  type="text"
                  value={editBank}
                  onChange={(e) => setEditBank(e.target.value)}
                  placeholder="Contoh: BSI, Bank Aceh, Mandiri..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  placeholder="Keterangan setoran..."
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#0b6330]/20"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-xl transition-colors"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="px-4 py-2 bg-[#0b6330] hover:bg-[#084e26] text-white text-xs font-bold rounded-xl transition-colors shadow-sm disabled:opacity-50"
                >
                  {editSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PintasSetoranPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fafbfc] flex items-center justify-center p-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0b6330]" />
        </div>
      }
    >
      <PintasSetoranContent />
    </Suspense>
  );
}

