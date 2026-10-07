'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { loginManual, registerManual, loginOrRegisterGoogle } from '@/lib/user-auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faLock,
  faUser,
  faArrowRight,
  faSpinner,
  faCheckCircle,
  faGraduationCap,
  faBriefcase,
  faUsers,
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

export default function MasukClient() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nama, setNama] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [googleModal, setGoogleModal] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');

  // Deteksi domain realtime
  const cleanEmail = email.trim().toLowerCase();
  const isMhs = cleanEmail.endsWith('@mhs.usk.ac.id');
  const isDosen = cleanEmail.endsWith('@usk.ac.id') && !isMhs;
  const isUmum = cleanEmail.includes('@') && !isMhs && !isDosen;

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!email.trim() || !password) {
      setErrorMsg('Mohon isi email dan kata sandi.');
      return;
    }

    setLoading(true);
    try {
      if (tab === 'login') {
        const res = await loginManual({ email, password });
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal masuk akun.');
          return;
        }
        const searchParams = new URLSearchParams(window.location.search);
        const redirectParam = searchParams.get('redirect');
        if (res.needsOnboarding) {
          router.push('/akun/onboarding');
        } else {
          router.push(redirectParam || '/akun');
        }
      } else {
        const res = await registerManual({ email, password, name: nama });
        if (!res.success) {
          setErrorMsg(res.error || 'Gagal mendaftar akun.');
          return;
        }
        router.push('/akun/onboarding');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;
    setLoading(true);
    try {
      const res = await loginOrRegisterGoogle({
        email: googleEmail,
        name: googleName || googleEmail.split('@')[0],
      });
      if (!res.success) {
        setErrorMsg(res.error || 'Gagal masuk via Google.');
        return;
      }
      setGoogleModal(false);
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get('redirect');
      if (res.needsOnboarding) {
        router.push('/akun/onboarding');
      } else {
        router.push(redirectParam || '/akun');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
      <div className="max-w-md w-full space-y-6">
        {/* Brand Header dengan Logo Resmi Bunga Rumah Amal USK */}
        <div className="text-center space-y-3">
          <Link href="/" className="inline-flex items-center justify-center transition-transform hover:scale-105">
            <Image
              src="/logo/emblem-ra.png"
              alt="Rumah Amal Masjid Jamik USK"
              width={100}
              height={100}
              priority
              className="h-20 sm:h-24 w-auto object-contain mx-auto drop-shadow-xs"
            />
          </Link>
          <div className="space-y-1">
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-800 tracking-tight">
              Portal Akun Pendaftar
            </h1>
            <p className="text-xs text-gray-500">
              Masuk untuk mengakses pendaftaran beasiswa, bantuan, dan status seleksi
            </p>
          </div>
        </div>

        {/* Card Form */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-7 sm:p-8 space-y-6">
          {/* Tombol Masuk Google */}
          <div>
            <button
              type="button"
              onClick={() => {
                setGoogleEmail(email || '');
                setGoogleModal(true);
              }}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm transition-all shadow-2xs cursor-pointer"
            >
              <FontAwesomeIcon icon={faGoogle} className="text-red-500 text-base" />
              <span>Lanjutkan dengan Akun Google</span>
            </button>
          </div>

          <div className="relative flex items-center justify-center">
            <div className="border-t border-gray-200 w-full" />
            <span className="bg-white px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400 absolute">
              atau masuk manual
            </span>
          </div>

          {/* Tab Selector Login vs Register */}
          <div className="grid grid-cols-2 p-1 bg-gray-100 rounded-2xl">
            <button
              type="button"
              onClick={() => { setTab('login'); setErrorMsg(''); }}
              className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                tab === 'login' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Masuk Akun
            </button>
            <button
              type="button"
              onClick={() => { setTab('register'); setErrorMsg(''); }}
              className={`py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                tab === 'register' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              Daftar Baru
            </button>
          </div>

          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-start gap-2">
              <span className="shrink-0 text-base">⚠️</span>
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            {tab === 'register' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5">Nama Lengkap</label>
                <div className="relative">
                  <FontAwesomeIcon icon={faUser} className="absolute left-3.5 top-3 text-gray-400 text-xs" />
                  <input
                    type="text"
                    required
                    placeholder="Nama sesuai KTP/KTM"
                    value={nama}
                    onChange={(e) => setNama(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] transition-colors"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Alamat Email</label>
              <div className="relative">
                <FontAwesomeIcon icon={faEnvelope} className="absolute left-3.5 top-3 text-gray-400 text-xs" />
                <input
                  type="email"
                  required
                  placeholder="contoh: nama@mhs.usk.ac.id atau nama@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] transition-colors"
                />
              </div>

              {/* Realtime Domain Detection Feedback */}
              {isMhs && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-[11px] font-bold animate-fadeIn">
                  <FontAwesomeIcon icon={faGraduationCap} className="text-emerald-600" />
                  <span>Email Mahasiswa USK terdeteksi (Otomatis kelompok Mahasiswa)</span>
                </div>
              )}
              {isDosen && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 text-blue-800 text-[11px] font-bold animate-fadeIn">
                  <FontAwesomeIcon icon={faBriefcase} className="text-blue-600" />
                  <span>Email Dosen / Staff USK terdeteksi (Otomatis kelompok Dosen/Staff)</span>
                </div>
              )}
              {isUmum && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2 text-amber-800 text-[11px] font-bold animate-fadeIn">
                  <FontAwesomeIcon icon={faUsers} className="text-amber-600" />
                  <span>Email Umum (Pilihan kelompok tersedia di pengisian profil berikutnya)</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">Kata Sandi</label>
              <div className="relative">
                <FontAwesomeIcon icon={faLock} className="absolute left-3.5 top-3 text-gray-400 text-xs" />
                <input
                  type="password"
                  required
                  placeholder="Minimal 6 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-xl bg-[#005621] hover:bg-[#004219] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  <span>Memproses…</span>
                </>
              ) : (
                <>
                  <span>{tab === 'login' ? 'Masuk ke Akun' : 'Daftar Sekarang'}</span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Back Link */}
        <div className="text-center">
          <Link href="/" className="text-xs text-gray-500 hover:text-[#005621] font-bold transition-colors">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>

      {/* MODAL SIMULASI GOOGLE SIGN-IN */}
      {googleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl border border-gray-100 overflow-hidden p-6 space-y-4 animate-scaleUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <FontAwesomeIcon icon={faGoogle} className="text-red-500 text-lg" />
                <h3 className="font-extrabold text-gray-900 text-sm">Masuk dengan Google</h3>
              </div>
              <button
                type="button"
                onClick={() => setGoogleModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-gray-500 leading-relaxed">
              Masukkan email akun Google Anda (bisa menggunakan email kampus <b>@mhs.usk.ac.id</b>, <b>@usk.ac.id</b>, atau <b>@gmail.com</b>).
            </p>

            <form onSubmit={handleGoogleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Email Google</label>
                <input
                  type="email"
                  required
                  placeholder="nama@mhs.usk.ac.id atau nama@gmail.com"
                  value={googleEmail}
                  onChange={(e) => setGoogleEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nama Tampilan</label>
                <input
                  type="text"
                  placeholder="Nama Lengkap Anda"
                  value={googleName}
                  onChange={(e) => setGoogleName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621]"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setGoogleModal(false)}
                  className="px-4 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={loading || !googleEmail.trim()}
                  className="px-5 py-2 text-xs font-extrabold text-white bg-[#005621] hover:bg-[#004219] rounded-xl shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {loading ? <FontAwesomeIcon icon={faSpinner} className="animate-spin" /> : <FontAwesomeIcon icon={faCheckCircle} />}
                  <span>Lanjutkan Masuk</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
