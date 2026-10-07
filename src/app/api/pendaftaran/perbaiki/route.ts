import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadFileToDrive, deleteFileFromDrive } from '@/lib/google-drive';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get('token') as string;

    if (!token) {
      return NextResponse.json({ success: false, error: 'Token pendaftaran wajib disertakan.' }, { status: 400 });
    }

    const submission = await prisma.submission.findUnique({
      where: { token },
      include: {
        program: {
          include: {
            documentFields: { orderBy: { order: 'asc' } },
            biodataFields: { orderBy: { order: 'asc' } },
          },
        },
        documents: true,
      },
    });

    if (!submission) {
      return NextResponse.json({ success: false, error: 'Pendaftaran tidak ditemukan.' }, { status: 404 });
    }

    // 1. Validasi Kunci Status Seleksi
    if (submission.status === 'lolos' || submission.status === 'tidak_lolos') {
      return NextResponse.json(
        { success: false, error: 'Pendaftaran Anda telah selesai diseleksi dan formulir sudah dikunci.' },
        { status: 400 }
      );
    }

    // 2. Validasi Batas Waktu Program
    const now = new Date();
    if (
      submission.program.status !== 'dibuka' ||
      (submission.program.tanggalTutup && now > new Date(submission.program.tanggalTutup))
    ) {
      return NextResponse.json(
        { success: false, error: 'Masa pendaftaran dan perbaikan berkas untuk program ini telah berakhir.' },
        { status: 400 }
      );
    }

    // 3. Proses Pembaruan Biodata
    const currentBiodata = (submission.biodataValues as Record<string, any>) || {};
    const updatedBiodata: Record<string, any> = { ...currentBiodata };
    let hasBiodataChanges = false;

    for (const field of submission.program.biodataFields) {
      const val = formData.get(`biodata_${field.key}`);
      if (val !== null && typeof val === 'string') {
        const trimmed = val.trim();
        if (field.required && !trimmed) {
          return NextResponse.json(
            { success: false, error: `Kolom data diri "${field.label}" wajib diisi.` },
            { status: 400 }
          );
        }
        if (currentBiodata[field.key] !== trimmed) {
          hasBiodataChanges = true;
        }
        updatedBiodata[field.key] = trimmed;
      }
    }

    // Dapatkan nama pendaftar (terbaru) untuk folder tag
    const applicantNameKey = Object.keys(updatedBiodata).find((k) => k.toLowerCase().includes('nama'));
    const applicantName = applicantNameKey ? String(updatedBiodata[applicantNameKey]) : 'Pendaftar';
    const folderTag = `${applicantName.slice(0, 30)} - ${submission.token.slice(0, 8)}`;

    // 4. Cari Berkas yang Diunggah Ulang
    const filesToUpdate: {
      fieldKey: string;
      docField: typeof submission.program.documentFields[0];
      file: File;
    }[] = [];

    for (const docField of submission.program.documentFields) {
      const fileEntry = formData.get(`reupload_${docField.key}`);
      if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry && (fileEntry as File).size > 0) {
        filesToUpdate.push({
          fieldKey: docField.key,
          docField,
          file: fileEntry as File,
        });
      }
    }

    if (!hasBiodataChanges && filesToUpdate.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Tidak ada perubahan data diri atau berkas yang dikirimkan.' },
        { status: 400 }
      );
    }

    // 5. Upload File Revisi ke Google Drive / Fallback
    for (const item of filesToUpdate) {
      const arrayBuffer = await item.file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadRes = await uploadFileToDrive({
        buffer,
        originalFilename: item.file.name,
        mimeType: item.file.type,
        programName: submission.program.nama,
        batchName: submission.batch || (submission.program as any).batchAktif || undefined,
        applicantFolderTag: folderTag,
      });

      const existingDoc = submission.documents.find((d) => d.fieldKey === item.fieldKey);

      if (existingDoc) {
        // Hapus file lama dari Google Drive / storage lokal agar hemat kapasitas dan tidak menumpuk
        if (existingDoc.driveFileId || existingDoc.fileUrl) {
          await deleteFileFromDrive(existingDoc.fileUrl, existingDoc.driveFileId);
        }

        await prisma.submissionDocument.update({
          where: { id: existingDoc.id },
          data: {
            originalFilename: item.file.name,
            fileUrl: uploadRes.fileUrl,
            driveFileId: uploadRes.fileId,
            fileSizeBytes: item.file.size,
            mimeType: item.file.type,
            ocrText: null, // Reset teks OCR agar diverifikasi ulang
            needsRevision: false,
            revisionNote: null,
          },
        });
      } else {
        await prisma.submissionDocument.create({
          data: {
            submissionId: submission.id,
            documentFieldId: item.docField.id,
            fieldKey: item.fieldKey,
            originalFilename: item.file.name,
            fileUrl: uploadRes.fileUrl,
            driveFileId: uploadRes.fileId,
            fileSizeBytes: item.file.size,
            mimeType: item.file.type,
          },
        });
      }
    }

    // 6. Simpan Biodata Baru & Kembalikan Status ke 'menunggu_diproses' agar diverifikasi ulang worker
    await prisma.submission.update({
      where: { id: submission.id },
      data: {
        biodataValues: updatedBiodata,
        status: 'menunggu_diproses',
        processingStartedAt: null,
      },
    });

    const messages = [];
    if (hasBiodataChanges) messages.push('Biodata berhasil diperbarui');
    if (filesToUpdate.length > 0) messages.push(`${filesToUpdate.length} berkas berhasil diunggah ulang`);

    return NextResponse.json({
      success: true,
      message: `${messages.join(' dan ')}. Data Anda telah kembali masuk ke antrean verifikasi otomatis sistem.`,
    });
  } catch (error: any) {
    console.error('[API /api/pendaftaran/perbaiki error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem saat menyimpan perbaikan data.' },
      { status: 500 }
    );
  }
}
