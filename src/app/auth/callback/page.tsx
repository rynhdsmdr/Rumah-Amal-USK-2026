'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import { loginOrRegisterGoogle } from '@/lib/user-auth';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner, faCheckCircle, faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import Image from 'next/image';
import Link from 'next/link';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Menghubungkan akun Google Anda...');

  useEffect(() => {
    let isMounted = true;

    async function handleAuth() {
      try {
        // Cek error dari query param jika ada
        const errorParam = searchParams.get('error_description') || searchParams.get('error');
        if (errorParam) {
          throw new Error(errorParam);
        }

        // Ambil session dari Supabase browser client
        const { data: sessionData, error: sessionError } = await supabaseBrowser.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        let user: any = sessionData?.session?.user;

        // Jika belum ada di getSession, coba getUser
        if (!user) {
          const { data: userData, error: userError } = await supabaseBrowser.auth.getUser();
          if (userError || !userData.user) {
            // Tunggu sebentar jika event auth-state sedang memproses hash
            await new Promise((resolve) => setTimeout(resolve, 800));
            const { data: retryData } = await supabaseBrowser.auth.getSession();
            user = retryData?.session?.user || null;
          } else {
            user = userData.user;
          }
        }

        if (!user || !user.email) {
          throw new Error('Tidak dapat menemukan data akun dari Google.');
        }

        if (!isMounted) return;
        setMessage('Menyiapkan sesi pendaftar...');

        const email = user.email;
        const name =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          email.split('@')[0];
        const image = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

        // Simpan ke database pendaftar & buat cookie sesi ra_user_session
        const res = await loginOrRegisterGoogle({
          email,
          name,
          image,
        });

        if (!res.success) {
          throw new Error(res.error || 'Gagal menyinkronkan akun Google.');
        }

        if (!isMounted) return;
        setStatus('success');
        setMessage('Berhasil masuk! Mengalihkan ke portal...');

        const redirectParam = searchParams.get('redirect');
        setTimeout(() => {
          if (res.needsOnboarding) {
            router.replace('/akun/onboarding');
          } else {
            router.replace(redirectParam || '/akun');
          }
        }, 600);
      } catch (err: any) {
        if (!isMounted) return;
        console.error('[Auth Callback Error]', err);
        setStatus('error');
        setMessage(err.message || 'Terjadi kesalahan saat masuk dengan Google.');
      }
    }

    handleAuth();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 max-w-md w-full text-center space-y-6">
        <div className="flex justify-center">
          <Image
            src="/logo/emblem-ra.png"
            alt="Rumah Amal USK"
            width={80}
            height={80}
            priority
            style={{ width: 'auto', height: 'auto' }}
            className="h-16 object-contain mx-auto"
          />
        </div>

        <div className="space-y-2">
          {status === 'loading' && (
            <>
              <div className="flex justify-center text-[#005621] text-3xl mb-2">
                <FontAwesomeIcon icon={faSpinner} className="animate-spin" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Masuk Akun Google</h2>
              <p className="text-xs text-gray-500">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div className="flex justify-center text-emerald-600 text-3xl mb-2">
                <FontAwesomeIcon icon={faCheckCircle} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Autentikasi Berhasil</h2>
              <p className="text-xs text-emerald-700 font-medium">{message}</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="flex justify-center text-rose-600 text-3xl mb-2">
                <FontAwesomeIcon icon={faExclamationCircle} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Autentikasi Gagal</h2>
              <p className="text-xs text-rose-600">{message}</p>
              <div className="pt-4">
                <Link
                  href="/masuk"
                  className="inline-block py-2.5 px-6 rounded-xl bg-[#005621] hover:bg-[#004218] text-white font-bold text-xs transition-colors"
                >
                  Kembali ke Halaman Masuk
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <FontAwesomeIcon icon={faSpinner} className="animate-spin text-[#005621] text-2xl" />
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
