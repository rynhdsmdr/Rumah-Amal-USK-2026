'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { loginManual, registerManual } from '@/lib/user-auth';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faEnvelope,
  faLock,
  faArrowRight,
  faSpinner,
  faCheckCircle,
  faGraduationCap,
  faBriefcase,
} from '@fortawesome/free-solid-svg-icons';
import { faGoogle } from '@fortawesome/free-brands-svg-icons';

export default function MasukClient() {
  const router = useRouter();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Deteksi domain realtime untuk panduan pengguna
  const cleanEmail = email.trim().toLowerCase();
  const isMhs = cleanEmail.endsWith('@mhs.usk.ac.id');
  const isDosen = cleanEmail.endsWith('@usk.ac.id') && !isMhs;

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
        const res = await registerManual({ email, password });
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

  const handleGoogleOAuth = async () => {
    setErrorMsg('');
    setGoogleLoading(true);
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const redirectParam = searchParams.get('redirect') || '/akun';
      const origin = window.location.origin;

      const { data, error } = await supabaseBrowser.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(redirectParam)}`,
          queryParams: {
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });

      if (error) {
        throw error;
      }

      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error('[Google Sign-In Error]', err);
      setErrorMsg(
        'Gagal membuka layanan masuk Google. Silakan coba beberapa saat lagi atau gunakan formulir masuk manual di bawah.'
      );
      setGoogleLoading(false);
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
              width={96}
              height={96}
              priority
              style={{ width: 'auto', height: 'auto' }}
              className="h-20 sm:h-24 object-contain mx-auto drop-shadow-xs"
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
          {/* Tombol Masuk Google Langsung ke Sign In Google */}
          <div>
            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={googleLoading || loading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-2xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 font-bold text-xs sm:text-sm transition-all shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {googleLoading ? (
                <FontAwesomeIcon icon={faSpinner} className="animate-spin text-gray-600" />
              ) : (
                <FontAwesomeIcon icon={faGoogle} className="text-red-500 text-base" />
              )}
              <span>{googleLoading ? 'Membuka Google Sign-In...' : 'Lanjutkan dengan Akun Google'}</span>
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

          {/* Alert Error */}
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-start gap-2">
              <span className="text-base shrink-0">⚠️</span>
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Form Manual */}
          <form onSubmit={handleManualSubmit} className="space-y-4">

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Alamat Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <FontAwesomeIcon icon={faEnvelope} />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contoh: nama@mhs.usk.ac.id atau nama@gmail.com"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] focus:ring-2 focus:ring-emerald-50 transition-all"
                />
              </div>

              {/* Live Domain Hints */}
              {cleanEmail && (
                <div className="mt-2 text-2xs space-y-1">
                  {isMhs && (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      <FontAwesomeIcon icon={faGraduationCap} />
                      <span>Terdeteksi Mahasiswa USK (Akses khusus Beasiswa UKT dsb)</span>
                    </div>
                  )}
                  {isDosen && (
                    <div className="flex items-center gap-1.5 text-blue-700 font-bold bg-blue-50 p-2 rounded-lg border border-blue-200">
                      <FontAwesomeIcon icon={faBriefcase} />
                      <span>Terdeteksi Dosen / Staf USK</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1.5">
                Kata Sandi
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                  <FontAwesomeIcon icon={faLock} />
                </div>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs font-medium focus:outline-none focus:border-[#005621] focus:ring-2 focus:ring-emerald-50 transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#005621] hover:bg-[#004218] text-white font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>{tab === 'login' ? 'Masuk ke Akun' : 'Daftar Akun Baru'}</span>
                  <FontAwesomeIcon icon={faArrowRight} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Nav */}
        <div className="text-center text-xs text-gray-500">
          <Link href="/" className="hover:text-gray-900 transition-colors">
            ← Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  );
}
