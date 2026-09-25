import { neonPrisma } from '@/lib/neon-prisma';
import { downloadFileBuffer, uploadMergedPdfToDrive } from '@/lib/google-drive';
import {
  checkExpectedKeywords,
  checkDocumentMaxAge,
  checkApplicantNameMatch,
  runOcrOnBuffer,
  mergeDocumentsToSinglePdf,
  VerificationWarning,
} from '@/lib/verification-pipeline';
import { sendCorrectionEmail } from '@/lib/email-service';

export function extractApplicantName(biodata: Record<string, any>): string {
  if (!biodata || typeof biodata !== 'object') return '';

  const priorityKeys = [
    'nama_lengkap',
    'nama_mahasiswa',
    'nama_pendaftar',
    'nama_pemohon',
    'nama_peserta',
    'nama_siswa',
    'nama',
    'full_name',
    'name',
  ];

  for (const key of priorityKeys) {
    if (biodata[key] && typeof biodata[key] === 'string' && biodata[key].trim()) {
      return biodata[key].trim();
    }
  }

  const ignorePatterns = [
    'ayah',
    'ibu',
    'wali',
    'orang_tua',
    'ortu',
    'keluarga',
    'suami',
    'istri',
    'rekomendasi',
    'pejabat',
    'dosen',
    'keuchik',
    'kepala',
    'bank',
    'prodi',
    'fakultas',
  ];

  const nameKeys = Object.keys(biodata).filter((k) => {
    const lk = k.toLowerCase();
    return lk.includes('nama') && !ignorePatterns.some((pat) => lk.includes(pat));
  });

  if (nameKeys.length > 0 && biodata[nameKeys[0]] && typeof biodata[nameKeys[0]] === 'string') {
    return biodata[nameKeys[0]].trim();
  }

  const fallbackKey = Object.keys(biodata).find((k) => k.toLowerCase().includes('nama'));
  return fallbackKey && biodata[fallbackKey] ? String(biodata[fallbackKey]).trim() : '';
}

export async function executeQueueProcessing() {
  // 1. Pemulihan Antrean Macet (Stuck Submissions > 15 menit)
  const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
  const stuckSubmissions = await neonPrisma.submission.updateMany({
    where: {
      status: 'sedang_diproses',
      processingStartedAt: { lt: fifteenMinutesAgo },
    },
    data: {
      status: 'gagal_diproses',
    },
  });

  // 2. Ambil Batch Submission Berstatus 'menunggu_diproses' atau 'gagal_diproses' (maks 3-5 agar aman dari execution timeout)
  const pendingSubmissions = await neonPrisma.submission.findMany({
    where: {
      status: { in: ['menunggu_diproses', 'gagal_diproses'] },
    },
    take: 3,
    include: {
      program: {
        include: {
          documentFields: { orderBy: { order: 'asc' } },
          biodataFields: { orderBy: { order: 'asc' } },
        },
      },
      documents: true,
    },
    orderBy: { submittedAt: 'asc' },
  });

  if (pendingSubmissions.length === 0) {
    return {
      success: true,
      message: 'Tidak ada antrean pendaftaran yang menunggu diproses.',
      processed: 0,
      stuckRecovered: stuckSubmissions.count,
    };
  }

  const processedResults = [];

  // 3. Proses Tiap Submission Secara Sekuensial
  for (const submission of pendingSubmissions) {
    // Pasang Row-level Lock Sederhana
    await neonPrisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'sedang_diproses',
        processingStartedAt: new Date(),
      },
    });

    const warnings: VerificationWarning[] = [];
    const downloadedFiles: { buffer: Buffer; mimeType: string; filename: string }[] = [];

    // Dapatkan nama pendaftar dari biodataValues menggunakan extractor cerdas
    const biodata = (submission.biodataValues as Record<string, any>) || {};
    const applicantName = extractApplicantName(biodata);

    // Map dokumen yang diupload berdasarkan key field
    const uploadedDocsMap = new Map(submission.documents.map((d) => [d.fieldKey, d]));

    // 3a. Periksa Tiap Syarat Dokumen (DocumentField)
    for (const docField of submission.program.documentFields) {
      const uploadedDoc = uploadedDocsMap.get(docField.key);

      // Validasi 1: Kelengkapan Dokumen Wajib
      if (!uploadedDoc) {
        if (docField.required) {
          warnings.push({
            fieldKey: docField.key,
            fieldLabel: docField.label,
            type: 'missing_document',
            message: `Berkas "${docField.label}" wajib diunggah tetapi tidak ditemukan.`,
            severity: 'warning',
          });
        }
        continue;
      }

      // Tandai flag stempel manual jika field membutuhkan
      if (docField.needsStampCheck) {
        warnings.push({
          fieldKey: docField.key,
          fieldLabel: docField.label,
          type: 'needs_manual_check',
          message: `Berkas "${docField.label}" membutuhkan verifikasi tanda tangan / stempel basah manual oleh verifikator.`,
          severity: 'info',
        });
      }

      // Download isi buffer berkas
      let fileBuffer: Buffer | null = null;
      try {
        fileBuffer = await downloadFileBuffer(uploadedDoc.fileUrl, uploadedDoc.driveFileId);
        downloadedFiles.push({
          buffer: fileBuffer,
          mimeType: uploadedDoc.mimeType || 'application/octet-stream',
          filename: uploadedDoc.originalFilename,
        });
      } catch (downloadErr: any) {
        console.error(`[Gagal download berkas ${uploadedDoc.id}]`, downloadErr);
        warnings.push({
          fieldKey: docField.key,
          fieldLabel: docField.label,
          type: 'ocr_failed',
          message: `Berkas "${docField.label}" tidak dapat diunduh untuk verifikasi.`,
          severity: 'warning',
        });
        continue;
      }

      // Jika dokumen adalah single combined upload (misal foto rumah) dan bukan teks, skip OCR
      if (docField.isSingleCombinedUpload) {
        continue;
      }

      // 3b. Jalankan OCR (jika berupa gambar)
      let ocrText = uploadedDoc.ocrText || '';
      if (!ocrText && uploadedDoc.mimeType?.startsWith('image/')) {
        ocrText = await runOcrOnBuffer(fileBuffer, uploadedDoc.mimeType);
        // Simpan teks OCR ke database agar tidak perlu OCR ulang
        await neonPrisma.submissionDocument.update({
          where: { id: uploadedDoc.id },
          data: { ocrText },
        });
      }

      // Apakah dokumen ini membutuhkan pengecekan kesesuaian nama pendaftar
      const shouldCheckName =
        docField.nameCheckApplicable ||
        (!docField.isSingleCombinedUpload &&
          ['ktp', 'ktm', 'kartu', 'permohonan', 'rekomendasi', 'sktm', 'transkrip', 'krs', 'identitas', 'paspor', 'ijazah', 'mualaf'].some(
            (k) => docField.key.toLowerCase().includes(k) || docField.label.toLowerCase().includes(k)
          ));

      // Jika OCR menghasilkan teks, lakukan validasi lanjutan:
      if (ocrText && ocrText.trim().length > 0) {
        // Validasi 2: Pengecekan Kata Kunci (Expected Keywords)
        if (docField.expectedKeywords && docField.expectedKeywords.length > 0) {
          const kwCheck = checkExpectedKeywords(ocrText, docField.expectedKeywords);
          if (!kwCheck.matches) {
            warnings.push({
              fieldKey: docField.key,
              fieldLabel: docField.label,
              type: 'keyword_mismatch',
              message: `Teks pada berkas "${docField.label}" tidak memuat kata kunci yang diharapkan (${docField.expectedKeywords.join(', ')}). Kemungkinan salah unggah file.`,
              severity: 'warning',
            });
          }
        }

        // Validasi 3: Batas Masa Berlaku Dokumen (Max Age Months)
        if (docField.maxAgeMonths) {
          const ageCheck = checkDocumentMaxAge(ocrText, submission.submittedAt, docField.maxAgeMonths);
          if (!ageCheck.valid) {
            warnings.push({
              fieldKey: docField.key,
              fieldLabel: docField.label,
              type: 'expired_document',
              message: `Masa berlaku berkas "${docField.label}" bermasalah: ${ageCheck.reason}`,
              severity: 'warning',
            });
          }
        }

        // Validasi 4: Pengecekan Kesesuaian Nama Pendaftar (Fuzzy Match & OCR Normalization)
        if (shouldCheckName && applicantName) {
          const nameCheck = checkApplicantNameMatch(ocrText, applicantName);
          if (!nameCheck.matches) {
            warnings.push({
              fieldKey: docField.key,
              fieldLabel: docField.label,
              type: 'name_mismatch',
              message: `Kesesuaian nama bermasalah: Nama pendaftar "${applicantName}" tidak terdeteksi pada berkas "${docField.label}". Kemungkinan berkas milik orang lain atau hasil scan buram.`,
              severity: 'warning',
            });
          }
        }
      } else if (shouldCheckName && applicantName) {
        // Jika berkas tidak menghasilkan teks OCR padahal memerlukan verifikasi nama
        warnings.push({
          fieldKey: docField.key,
          fieldLabel: docField.label,
          type: 'ocr_failed',
          message: `Teks pada berkas "${docField.label}" tidak dapat dibaca oleh sistem OCR sehingga kesesuaian nama "${applicantName}" perlu diverifikasi secara manual oleh verifikator.`,
          severity: 'info',
        });
      }
    }

    // 3c. Gabungkan Seluruh Dokumen Menjadi Satu PDF Utuh (Merge PDF)
    let mergedPdfUrl: string | null = null;
    if (downloadedFiles.length > 0) {
      try {
        const mergedBuffer = await mergeDocumentsToSinglePdf(downloadedFiles);
        const folderTag = `${applicantName.slice(0, 30)} - ${submission.token.slice(0, 8)}`;
        const filename = `Berkas_Lengkap_${applicantName.replace(/[^a-zA-Z0-9]/g, '_')}_${submission.token.slice(0, 6)}.pdf`;

        const uploadMergeRes = await uploadMergedPdfToDrive({
          buffer: mergedBuffer,
          filename,
          programName: submission.program.nama,
          applicantFolderTag: folderTag,
        });

        mergedPdfUrl = uploadMergeRes.fileUrl;
      } catch (mergeErr) {
        console.error(`[Gagal merge PDF submission: ${submission.id}]`, mergeErr);
      }
    }

    // 3d. Finalisasi Status Submission Menjadi 'belum_diseleksi'
    const updatedSubmission = await neonPrisma.submission.update({
      where: { id: submission.id },
      data: {
        status: 'belum_diseleksi',
        warnings: warnings as any,
        linkDokumenGabungan: mergedPdfUrl,
      },
    });

    // 3e. Kirim Email Notifikasi Perbaikan jika ada Warning Kritis (Dokumen salah, tidak cocok, expired)
    const actionableWarnings = warnings.filter((w) =>
      ['missing_document', 'keyword_mismatch', 'expired_document', 'name_mismatch'].includes(w.type)
    );

    if (actionableWarnings.length > 0) {
      const applicantEmailKey = Object.keys(biodata).find((k) => k.toLowerCase().includes('email'));
      const applicantEmail = applicantEmailKey ? String(biodata[applicantEmailKey]) : '';

      // Trigger kirim email perbaikan
      await sendCorrectionEmail({
        toEmail: applicantEmail,
        applicantName: applicantName || 'Pendaftar',
        programName: submission.program.nama,
        token: submission.token,
        warnings: actionableWarnings.map((w) => ({
          fieldLabel: w.fieldLabel,
          message: w.message,
        })),
      });
    }

    processedResults.push({
      id: updatedSubmission.id,
      token: updatedSubmission.token,
      warningsCount: warnings.length,
      hasMergedPdf: !!mergedPdfUrl,
      correctionEmailSent: actionableWarnings.length > 0,
    });
  }

  return {
    success: true,
    message: `Berhasil memproses ${processedResults.length} submission pendaftaran.`,
    processed: processedResults.length,
    stuckRecovered: stuckSubmissions.count,
    results: processedResults,
  };
}
