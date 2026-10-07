import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { uploadFileToDrive } from '@/lib/google-drive';
import { sendRegistrationConfirmationEmail } from '@/lib/email-service';
import { executeQueueProcessing } from '@/lib/worker-queue';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let createdSubmissionId: string | null = null;
  try {
    const formData = await req.formData();

    const programId = formData.get('programId') as string;
    if (!programId) {
      return NextResponse.json({ success: false, error: 'Program ID wajib disertakan.' }, { status: 400 });
    }

    // 1. Validasi keberadaan dan status program di database Neon
    const program = await prisma.programBantuan.findUnique({
      where: { id: programId },
      include: {
        biodataFields: { orderBy: { order: 'asc' } },
        documentFields: { orderBy: { order: 'asc' } },
      },
    });

    if (!program) {
      return NextResponse.json({ success: false, error: 'Program bantuan tidak ditemukan.' }, { status: 404 });
    }

    if (program.status !== 'dibuka') {
      return NextResponse.json(
        { success: false, error: 'Pendaftaran untuk program ini sedang ditutup.' },
        { status: 400 }
      );
    }

    const now = new Date();
    if (program.tanggalBuka && now < new Date(program.tanggalBuka)) {
      return NextResponse.json(
        { success: false, error: 'Pendaftaran program ini belum resmi dibuka.' },
        { status: 400 }
      );
    }
    if (program.tanggalTutup && now > new Date(program.tanggalTutup)) {
      return NextResponse.json(
        { success: false, error: 'Batas waktu pendaftaran program ini telah berakhir.' },
        { status: 400 }
      );
    }

    // 2. Parse dan validasi Biodata
    const biodataValues: Record<string, any> = {};
    for (const field of program.biodataFields) {
      const val = formData.get(`biodata_${field.key}`);
      const stringVal = typeof val === 'string' ? val.trim() : '';

      if (field.required && !stringVal) {
        return NextResponse.json(
          { success: false, error: `Kolom data diri "${field.label}" wajib diisi.` },
          { status: 400 }
        );
      }

      biodataValues[field.key] = stringVal;
    }

    // Pastikan Email terisi dan berformat valid untuk pengiriman tautan edit/konfirmasi
    const emailKey = Object.keys(biodataValues).find((k) => k.toLowerCase().includes('email')) || 'email';
    const emailValue = String(formData.get('biodata_email') || biodataValues[emailKey] || '').trim();
    if (!emailValue) {
      return NextResponse.json(
        { success: false, error: 'Alamat Email Aktif wajib diisi untuk pengiriman tautan bukti pendaftaran dan perbaikan berkas.' },
        { status: 400 }
      );
    }
    if (!emailValue.includes('@') || !emailValue.includes('.')) {
      return NextResponse.json(
        { success: false, error: 'Format Alamat Email tidak valid. Harap periksa kembali penulisan email Anda.' },
        { status: 400 }
      );
    }
    biodataValues[emailKey] = emailValue;
    biodataValues['email'] = emailValue;

    // 2b. Validasi Pencegahan Pendaftaran Ganda (Berdasarkan NPM / NIK / Identitas Mahasiswa)
    const identityKey = Object.keys(biodataValues).find((k) => {
      const lk = k.toLowerCase();
      return lk === 'npm' || lk === 'nim' || lk === 'nik' || lk.includes('npm') || lk.includes('nim') || lk.includes('nik');
    });

    if (identityKey && biodataValues[identityKey]) {
      const identityValue = String(biodataValues[identityKey]).trim();

      if (identityValue) {
        const existingSubmissions = await prisma.submission.findMany({
          where: { programId: program.id },
          select: {
            id: true,
            token: true,
            status: true,
            biodataValues: true,
          },
        });

        const duplicate = existingSubmissions.find((sub) => {
          const bio = (sub.biodataValues as Record<string, any>) || {};
          const existingIdVal = bio[identityKey];
          return (
            existingIdVal !== undefined &&
            existingIdVal !== null &&
            String(existingIdVal).trim().toLowerCase() === identityValue.toLowerCase()
          );
        });

        if (duplicate) {
          const fieldDef = program.biodataFields.find((f) => f.key === identityKey);
          const fieldLabel = fieldDef?.label || identityKey.toUpperCase();

          return NextResponse.json(
            {
              success: false,
              error: `${fieldLabel} "${identityValue}" sudah terdaftar pada program ${program.nama}. Anda tidak perlu mendaftar ulang. Tautan perbaikan formulir Anda telah dikirimkan ke email Anda saat mendaftar.`,
              existingToken: duplicate.token,
            },
            { status: 400 }
          );
        }
      }
    }

    // 3. Validasi keberadaan file dokumen wajib sebelum upload
    const filesToUpload: {
      field: typeof program.documentFields[0];
      file: File;
    }[] = [];

    const existingDocsToLink: {
      field: typeof program.documentFields[0];
      fileUrl: string;
      originalFilename: string;
    }[] = [];

    for (const docField of program.documentFields) {
      const fileEntry = formData.get(`doc_${docField.key}`);
      const existingUrl = formData.get(`existing_doc_${docField.key}`) as string | null;

      if (fileEntry && typeof fileEntry === 'object' && 'arrayBuffer' in fileEntry && (fileEntry as File).size > 0) {
        filesToUpload.push({
          field: docField,
          file: fileEntry as File,
        });
      } else if (existingUrl && existingUrl.trim()) {
        existingDocsToLink.push({
          field: docField,
          fileUrl: existingUrl.trim(),
          originalFilename: `${docField.label}.pdf`,
        });
      } else if (docField.required) {
        return NextResponse.json(
          { success: false, error: `Berkas persyaratan "${docField.label}" wajib diunggah.` },
          { status: 400 }
        );
      }
    }

    // 4. Generate tag pendaftar untuk nama folder
    const applicantNameKey = Object.keys(biodataValues).find((k) =>
      k.toLowerCase().includes('nama')
    );
    const applicantName = applicantNameKey ? String(biodataValues[applicantNameKey]) : 'Pendaftar';

    const userAccountId = (formData.get('userAccountId') as string | null) || null;

    // 5. Buat entri Submission terlebih dahulu dengan status 'menunggu_diproses'
    const submission = await prisma.submission.create({
      data: {
        programId: program.id,
        userAccountId: userAccountId || null,
        batch: program.batchAktif || null,
        biodataValues: biodataValues,
        status: 'menunggu_diproses',
        warnings: [],
      },
    });
    createdSubmissionId = submission.id;

    // Simpan dokumen yang otomatis terhubung dari Single Identity
    for (const doc of existingDocsToLink) {
      await prisma.submissionDocument.create({
        data: {
          submissionId: submission.id,
          documentFieldId: doc.field.id,
          fieldKey: doc.field.key,
          originalFilename: doc.originalFilename,
          fileUrl: doc.fileUrl,
          mimeType: 'application/pdf',
        },
      });
    }

    const folderTag = `${applicantName.slice(0, 30)} - ${submission.token.slice(0, 8)}`;

    // 6. Upload file ke Google Drive (atau fallback lokal) secara sekuensial hemat memori
    for (const { field, file } of filesToUpload) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadRes = await uploadFileToDrive({
        buffer,
        originalFilename: file.name,
        mimeType: file.type,
        programName: program.nama,
        batchName: program.batchAktif || undefined,
        applicantFolderTag: folderTag,
      });

      // Simpan record SubmissionDocument
      await prisma.submissionDocument.create({
        data: {
          submissionId: submission.id,
          documentFieldId: field.id,
          fieldKey: field.key,
          originalFilename: file.name,
          fileUrl: uploadRes.fileUrl,
          driveFileId: uploadRes.fileId,
          fileSizeBytes: file.size,
          mimeType: file.type,
        },
      });
    }

    // 7. Kirim email konfirmasi bukti pendaftaran berisi link langsung edit berkas
    try {
      await sendRegistrationConfirmationEmail({
        toEmail: emailValue,
        applicantName,
        programName: program.nama,
        token: submission.token,
      });
    } catch (emailErr) {
      console.error('[Gagal kirim email konfirmasi pendaftaran]', emailErr);
    }

    // 8. Picu Background Worker secara asinkron agar PDF gabungan & OCR langsung terbuat otomatis
    executeQueueProcessing().catch((workerErr) => {
      console.warn('[Auto-trigger worker notice]', workerErr?.message || workerErr);
    });

    // 9. Respon sukses cepat ke pendaftar
    return NextResponse.json({
      success: true,
      token: submission.token,
      email: emailValue,
      message: 'Pendaftaran berhasil dikirim. Tautan konfirmasi dan akses perbaikan formulir telah dikirimkan ke email Anda.',
      programTitle: program.nama,
      submittedAt: submission.submittedAt,
    });
  } catch (error: any) {
    // Bersihkan submission kosong jika upload file gagal di tengah jalan
    if (createdSubmissionId) {
      try {
        await prisma.submission.delete({ where: { id: createdSubmissionId } });
      } catch (delErr) {
        console.error('[Gagal rollback submission saat error upload]', delErr);
      }
    }

    console.error('[API /api/pendaftaran/submit error]', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Terjadi kesalahan sistem saat memproses formulir.' },
      { status: 500 }
    );
  }
}
