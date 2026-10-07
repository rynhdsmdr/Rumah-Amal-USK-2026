import { getUserSession, detectEmailKelompok, getFullUserProfile } from '@/lib/user-auth';
import { redirect } from 'next/navigation';
import OnboardingClient from './OnboardingClient';

export const metadata = {
  title: 'Lengkapi Profil Single Identity - Rumah Amal USK',
  description: 'Pengisian profil permanen biodata dan berkas untuk pendaftaran program bantuan Rumah Amal USK',
};

export default async function OnboardingPage() {
  const session = await getUserSession();
  if (!session) {
    redirect('/masuk');
  }

  const fullData = await getFullUserProfile();
  const detection = await detectEmailKelompok(session.email);

  return (
    <OnboardingClient
      user={session}
      existingProfile={fullData?.profile || null}
      initialKelompok={detection.kelompok}
      isLocked={detection.isLocked}
      availableOptions={detection.availableOptions}
    />
  );
}
