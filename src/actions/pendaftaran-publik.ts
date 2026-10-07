import prisma from '@/lib/prisma';
import { cache } from 'react';

/**
 * Mengambil daftar program bantuan/beasiswa yang statusnya aktif ('dibuka')
 * untuk ditampilkan pada katalog publik pendaftaran
 */
export async function getActivePrograms() {
  try {
    const programs = await prisma.programBantuan.findMany({
      where: {
        status: 'dibuka',
      },
      include: {
        _count: {
          select: {
            documentFields: true,
            biodataFields: true,
          },
        },
      },
      orderBy: [
        { tanggalTutup: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return { success: true, data: programs };
  } catch (error: any) {
    console.error('[getActivePrograms error]', error);
    return { success: false, error: error.message || 'Gagal memuat katalog program bantuan.' };
  }
}

/**
 * Mengambil detail program bantuan berdasarkan slug beserta field dokumen & biodata.
 * Menggunakan React cache() untuk per-request deduplication (aman, hanya berlaku dalam 1 siklus render HTTP).
 * Mencegah kueri duplikat antara generateMetadata() dan Page component.
 */
export const getPublicProgramBySlug = cache(async (slug: string) => {
  try {
    const program = await prisma.programBantuan.findUnique({
      where: { slug },
      include: {
        documentFields: {
          orderBy: { order: 'asc' },
        },
        biodataFields: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!program) {
      return { success: false, error: 'Program bantuan tidak ditemukan.' };
    }

    // Pastikan field email wajib selalu ada di biodata program
    const hasEmail = program.biodataFields.some(
      (f) => f.key.toLowerCase() === 'email' || f.key.toLowerCase().includes('email')
    );
    if (!hasEmail) {
      try {
        const createdField = await prisma.biodataField.create({
          data: {
            programId: program.id,
            key: 'email',
            label: 'Alamat Email Aktif',
            tipe: 'text',
            options: [],
            required: true,
            order: program.biodataFields.length,
          },
        });
        program.biodataFields.push(createdField);
      } catch {
        program.biodataFields.push({
          id: `auto_email_${program.id}`,
          programId: program.id,
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

    return { success: true, data: program };
  } catch (error: any) {
    console.error('[getPublicProgramBySlug error]', error);
    return { success: false, error: error.message || 'Gagal mengambil formulir program.' };
  }
});
