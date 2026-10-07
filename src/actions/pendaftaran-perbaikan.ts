import prisma from '@/lib/prisma';

/**
 * Mengambil data submission berdasarkan token untuk keperluan halaman perbaikan berkas
 */
export async function getSubmissionByToken(token: string) {
  try {
    const submission = await prisma.submission.findUnique({
      where: { token },
      include: {
        program: {
          include: {
            documentFields: { orderBy: { order: 'asc' } },
            biodataFields: { orderBy: { order: 'asc' } },
          },
        },
        documents: {
          include: {
            documentField: true,
          },
        },
      },
    });

    if (!submission) {
      return { success: false, error: 'Token pendaftaran tidak valid atau tidak ditemukan.' };
    }

    if (submission.program) {
      const hasEmail = submission.program.biodataFields.some(
        (f) => f.key.toLowerCase() === 'email' || f.key.toLowerCase().includes('email')
      );
      if (!hasEmail) {
        submission.program.biodataFields.push({
          id: `auto_email_${submission.program.id}`,
          programId: submission.program.id,
          key: 'email',
          label: 'Alamat Email Aktif',
          tipe: 'text',
          options: [],
          required: true,
          order: 999,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any);
      }
    }

    return { success: true, data: submission };
  } catch (error: any) {
    console.error('[getSubmissionByToken error]', error);
    return { success: false, error: error.message || 'Gagal memuat data pendaftar.' };
  }
}
