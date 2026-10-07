import { getUserSession } from '@/lib/user-auth';
import { redirect } from 'next/navigation';
import MasukClient from './MasukClient';

export const metadata = {
  title: 'Masuk Akun Pendaftar - Rumah Amal USK',
  description: 'Portal masuk dan pendaftaran akun penerima manfaat & program Rumah Amal USK',
};

export default async function MasukPage() {
  const session = await getUserSession();
  if (session) {
    if (!session.isProfileCompleted) {
      redirect('/akun/onboarding');
    }
    redirect('/akun');
  }

  return <MasukClient />;
}
