import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { getActivePrograms } from '@/actions/pendaftaran-publik';
import { getUserSession } from '@/lib/user-auth';
import PendaftaranKatalogClient from './PendaftaranKatalogClient';

export const metadata: Metadata = {
  title: 'Pendaftaran Beasiswa & Bantuan | Rumah Amal USK',
  description: 'Daftar program bantuan dan beasiswa terbuka di Rumah Amal Masjid Jamik Universitas Syiah Kuala.',
};

export const dynamic = 'force-dynamic';

export default async function PendaftaranPage() {
  const [result, userSession] = await Promise.all([
    getActivePrograms(),
    getUserSession(),
  ]);

  // Wajib memiliki akun terlebih dahulu
  if (!userSession) {
    redirect('/masuk?redirect=/pendaftaran');
  }

  // Wajib melengkapi single identity terlebih dahulu
  if (!userSession.isProfileCompleted) {
    redirect('/akun/onboarding');
  }

  const programs = result.success && result.data ? (result.data as any) : [];

  return (
    <PendaftaranKatalogClient
      initialPrograms={programs}
      userSession={userSession}
    />
  );
}

