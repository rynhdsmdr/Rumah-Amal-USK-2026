import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getUserSession, getFullUserProfile } from '@/lib/user-auth';
import AkunDashboardClient from './AkunDashboardClient';

export const metadata: Metadata = {
  title: 'Akun Pendaftar | Rumah Amal USK',
  description: 'Dashboard akun pendaftar, Single Identity, dan akses pendaftaran program bantuan Rumah Amal USK.',
};

export const dynamic = 'force-dynamic';

export default async function AkunPage() {
  const session = await getUserSession();

  if (!session) {
    redirect('/masuk');
  }

  if (!session.isProfileCompleted) {
    redirect('/akun/onboarding');
  }

  const [fullData, submissions] = await Promise.all([
    getFullUserProfile(),
    prisma.submission.findMany({
      where: { userAccountId: session.id },
      include: {
        program: {
          select: {
            id: true,
            nama: true,
            slug: true,
            status: true,
            kategori: true,
          },
        },
      },
      orderBy: { submittedAt: 'desc' },
    }),
  ]);

  return (
    <AkunDashboardClient
      user={session}
      profile={fullData?.profile || null}
      submissions={submissions as any}
    />
  );
}
