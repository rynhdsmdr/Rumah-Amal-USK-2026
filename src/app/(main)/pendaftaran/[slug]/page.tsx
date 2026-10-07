import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getPublicProgramBySlug } from '@/actions/pendaftaran-publik';
import { getUserSession, getFullUserProfile } from '@/lib/user-auth';
import FormPendaftaranClient from './FormPendaftaranClient';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const result = await getPublicProgramBySlug(slug);

  if (!result.success || !result.data) {
    return {
      title: 'Program Tidak Ditemukan | Rumah Amal USK',
    };
  }

  return {
    title: `Pendaftaran ${result.data.nama} | Rumah Amal USK`,
    description: result.data.deskripsi || `Formulir pendaftaran resmi ${result.data.nama} Rumah Amal USK.`,
  };
}

export const dynamic = 'force-dynamic';

export default async function PendaftaranDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const [result, session, fullData] = await Promise.all([
    getPublicProgramBySlug(slug),
    getUserSession(),
    getFullUserProfile(),
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  // Wajib memiliki akun terlebih dahulu
  if (!session) {
    redirect(`/masuk?redirect=/pendaftaran/${slug}`);
  }

  // Wajib melengkapi profil single identity
  if (!session.isProfileCompleted) {
    redirect('/akun/onboarding');
  }

  const program = result.data as any;

  // Cek jika akun tidak eligible (misal akun masyarakat umum buka program mahasiswa)
  if (session?.kelompok && program.targetKelompok && program.targetKelompok !== 'SEMUA') {
    if (session.kelompok !== program.targetKelompok) {
      redirect('/pendaftaran');
    }
  }

  return (
    <FormPendaftaranClient
      program={program}
      userSession={session}
      userProfile={fullData?.profile || null}
    />
  );
}
