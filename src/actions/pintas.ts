'use server';

import prisma from '@/lib/prisma';

// Default content for PINTAS
const DEFAULT_DEFINISI = `Program bantuan pinjaman tanpa syarat (PINTAS) adalah program bantuan pemberian dana dalam bentuk pinjaman dana tanpa imbalan kepada penerima sesuai dengan kriteria dengan jangka waktu pengembalian yang disepakati bersama.`;

const DEFAULT_SYARAT = `1. Surat Permohonan
2. Surat Rekomendasi dari Dosen/Staf USK
3. Mahasiswa Aktif/Dosen/Staf USK
4. Surat Pernyataan tidak merokok dan tidak pacaran
5. Kartu Identitas (KTP/KTM)
6. Pas photo berwarna terbaru`;

const DEFAULT_ALUR = `Mengunduh surat permohonan dan rekomendasi melalui link`;

const DEFAULT_LINK_DOWNLOAD = 'https://bit.ly/berkaspintasRA';
const DEFAULT_LINK_INFORMASI =
  'https://api.whatsapp.com/send/?phone=628116888123&text&type=phone_number&app_absent=0';

export async function getPintasDana() {
  try {
    let data = await (prisma as any).pintasDana.findUnique({
      where: { id: 'default' },
    });

    if (!data) {
      data = await (prisma as any).pintasDana.create({
        data: {
          id: 'default',
          kuotaTersedia: 25000000,
          infaqMasuk: 42500000,
          tersalurkan: 9500000,
          dicadangkan: 0,
          definisi: DEFAULT_DEFINISI,
          syaratAdmin: DEFAULT_SYARAT,
          alurPendaftaran: DEFAULT_ALUR,
          linkDownload: DEFAULT_LINK_DOWNLOAD,
          linkInformasi: DEFAULT_LINK_INFORMASI,
        },
      });
    }

    return {
      success: true,
      data: {
        ...data,
        linkDownload: data.linkDownload || DEFAULT_LINK_DOWNLOAD,
        linkInformasi: data.linkInformasi || DEFAULT_LINK_INFORMASI,
        updatedAt: data.updatedAt?.toISOString?.() || new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('getPintasDana error:', error);
    return { success: false, error: 'Gagal mengambil data PINTAS' };
  }
}

export async function updatePintasDana(formData: {
  kuotaTersedia: number;
  infaqMasuk: number;
  tersalurkan: number;
  dicadangkan: number;
  definisi?: string;
  syaratAdmin?: string;
  alurPendaftaran?: string;
  linkDownload?: string;
  linkInformasi?: string;
}) {
  try {
    const data = await (prisma as any).pintasDana.upsert({
      where: { id: 'default' },
      update: {
        kuotaTersedia: formData.kuotaTersedia,
        infaqMasuk: formData.infaqMasuk,
        tersalurkan: formData.tersalurkan,
        dicadangkan: formData.dicadangkan,
        definisi: formData.definisi,
        syaratAdmin: formData.syaratAdmin,
        alurPendaftaran: formData.alurPendaftaran,
        linkDownload: formData.linkDownload,
        linkInformasi: formData.linkInformasi,
      },
      create: {
        id: 'default',
        kuotaTersedia: formData.kuotaTersedia,
        infaqMasuk: formData.infaqMasuk,
        tersalurkan: formData.tersalurkan,
        dicadangkan: formData.dicadangkan,
        definisi: formData.definisi || DEFAULT_DEFINISI,
        syaratAdmin: formData.syaratAdmin || DEFAULT_SYARAT,
        alurPendaftaran: formData.alurPendaftaran || DEFAULT_ALUR,
        linkDownload: formData.linkDownload || '',
        linkInformasi: formData.linkInformasi || '',
      },
    });

    return {
      success: true,
      data: {
        ...data,
        updatedAt: data.updatedAt?.toISOString?.() || new Date().toISOString(),
      },
    };
  } catch (error) {
    console.error('updatePintasDana error:', error);
    return { success: false, error: 'Gagal memperbarui data PINTAS' };
  }
}
