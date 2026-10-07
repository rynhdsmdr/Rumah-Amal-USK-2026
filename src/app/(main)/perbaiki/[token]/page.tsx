import { Metadata } from 'next';
import Link from 'next/link';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faExclamationTriangle, faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { getSubmissionByToken } from '@/actions/pendaftaran-perbaikan';
import PerbaikiClient from './PerbaikiClient';

interface PageProps {
  params: Promise<{ token: string }>;
}

export const metadata: Metadata = {
  title: 'Perbaikan Berkas Pendaftaran | Rumah Amal USK',
  description: 'Halaman resmi perbaikan berkas pendaftaran bantuan dan beasiswa Rumah Amal USK.',
};

export const dynamic = 'force-dynamic';

export default async function PerbaikiPage({ params }: PageProps) {
  const { token } = await params;
  const result = await getSubmissionByToken(token);

  if (!result.success || !result.data) {
    return (
      <div className="min-h-screen bg-gray-50/60 py-16 px-4 sm:px-6 lg:px-8 font-sans flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-gray-200/80 shadow-xs p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center mx-auto text-xl shadow-2xs">
            <FontAwesomeIcon icon={faExclamationTriangle} />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Token Tidak Ditemukan</h1>
            <p className="text-xs text-gray-600 leading-relaxed font-normal">
              Token pendaftaran <strong className="font-mono text-gray-800 break-all">{token}</strong> tidak valid atau tidak terdaftar dalam sistem.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/pendaftaran"
              className="inline-flex items-center gap-2 py-2.5 px-6 bg-[#005621] hover:bg-[#004218] text-white font-bold text-xs rounded-xl shadow-2xs transition-all cursor-pointer"
            >
              <FontAwesomeIcon icon={faArrowLeft} className="w-3.5 h-3.5" />
              <span>Kembali ke Katalog Program</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <PerbaikiClient submission={result.data as any} />;
}
