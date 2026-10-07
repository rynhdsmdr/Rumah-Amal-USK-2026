import { Resend } from 'resend';

function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || apiKey.includes('ganti-dengan') || apiKey.includes('re_123456789')) {
    return null;
  }
  return new Resend(apiKey);
}

/**
 * Mengirim email notifikasi perbaikan dokumen ke pendaftar
 */
export async function sendCorrectionEmail({
  toEmail,
  applicantName,
  programName,
  token,
  warnings,
}: {
  toEmail: string;
  applicantName: string;
  programName: string;
  token: string;
  warnings: { fieldLabel: string; message: string }[];
}) {
  const resend = getResendClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const correctionUrl = `${baseUrl}/perbaiki/${token}`;
  const fromEmail = process.env.EMAIL_FROM || 'Rumah Amal USK <onboarding@resend.dev>';

  // Jika Resend belum dikonfigurasi, simpan log simulasi
  if (!resend || !toEmail) {
    console.log(`[SIMULASI EMAIL NOTIFIKASI PERBAIKAN DOKUMEN]`);
    console.log(`Ke: ${toEmail || 'Email tidak terisi di biodata'}`);
    console.log(`Nama: ${applicantName}`);
    console.log(`Program: ${programName}`);
    console.log(`Link Perbaikan: ${correctionUrl}`);
    console.log(`Daftar Berkas Bermasalah:`, warnings);
    return { success: true, simulated: true };
  }

  try {
    const warningListHtml = warnings
      .map(
        (w) => `
      <li style="margin-bottom: 8px;">
        <strong>${w.fieldLabel}</strong>: ${w.message}
      </li>
    `
      )
      .join('');

    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px; color: #1f2937;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h2 style="color: #0b6330; margin: 0;">Rumah Amal USK</h2>
          <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">Pemberitahuan Hasil Verifikasi Berkas Pendaftaran</p>
        </div>

        <p>Assalamu'alaikum Wr. Wb. <strong>${applicantName}</strong>,</p>

        <p style="line-height: 1.6; font-size: 14px;">
          Terima kasih telah mendaftar pada program <strong>${programName}</strong>. Sistem verifikasi otomatis kami telah memeriksa kelengkapan berkas yang Anda unggah.
        </p>

        <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h4 style="color: #92400e; margin: 0 0 10px 0; font-size: 14px;">⚠️ Berkas yang Perlu Diperbaiki / Dilengkapi:</h4>
          <ul style="font-size: 13px; color: #78350f; margin: 0; padding-left: 20px;">
            ${warningListHtml}
          </ul>
        </div>

        <p style="font-size: 14px; line-height: 1.6;">
          Anda <strong>tidak perlu mengisi ulang seluruh data diri</strong>. Cukup buka link di bawah ini dan unggah kembali dokumen yang bermasalah:
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a href="${correctionUrl}" style="background-color: #0b6330; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
            Buka Halaman Perbaikan Dokumen
          </a>
        </div>

        <p style="font-size: 12px; color: #6b7280; line-height: 1.5;">
          Token Pendaftaran Anda: <code style="background-color: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${token}</code><br/>
          Jika tombol di atas tidak dapat diklik, salin tautan berikut ke peramban web Anda:<br/>
          <a href="${correctionUrl}" style="color: #0b6330;">${correctionUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
          Email ini dikirim secara otomatis oleh Sistem Pendaftaran Rumah Amal Masjid Jamik USK Banda Aceh.
        </p>
      </div>
    `;

    const data = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `[Tindakan Diperlukan] Perbaikan Berkas Pendaftaran - ${programName}`,
      html: htmlContent,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('[Gagal kirim email via Resend]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mengirim email konfirmasi pendaftaran beserta tautan langsung untuk perbaikan berkas & biodata
 */
export async function sendRegistrationConfirmationEmail({
  toEmail,
  applicantName,
  programName,
  token,
}: {
  toEmail: string;
  applicantName: string;
  programName: string;
  token: string;
}) {
  const resend = getResendClient();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const editUrl = `${baseUrl}/perbaiki/${token}`;
  const fromEmail = process.env.EMAIL_FROM || 'Rumah Amal USK <onboarding@resend.dev>';

  // Jika Resend belum dikonfigurasi, simpan log simulasi
  if (!resend || !toEmail) {
    console.log(`=======================================================`);
    console.log(`[SIMULASI EMAIL KONFIRMASI PENDAFTARAN & TAUTAN EDIT]`);
    console.log(`Ke: ${toEmail || 'Email tidak terisi'}`);
    console.log(`Nama Pendaftar: ${applicantName}`);
    console.log(`Program: ${programName}`);
    console.log(`Tautan Edit & Perbaikan: ${editUrl}`);
    console.log(`Token Pendaftaran: ${token}`);
    console.log(`=======================================================`);
    return { success: true, simulated: true };
  }

  try {
    const htmlContent = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e5e7eb; border-radius: 16px; color: #1f2937; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
          <h2 style="color: #005621; margin: 0; font-size: 22px; font-weight: 800;">Rumah Amal Masjid Jamik USK</h2>
          <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">Konfirmasi Pendaftaran & Tautan Akses Formulir</p>
        </div>

        <p style="font-size: 15px; line-height: 1.6;">Assalamu'alaikum Wr. Wb. <strong>${applicantName}</strong>,</p>

        <p style="font-size: 14px; line-height: 1.6; color: #374151;">
          Terima kasih telah mendaftar pada program <strong>${programName}</strong>. Berkas dan isian data diri Anda telah berhasil kami terima.
        </p>

        <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 22px; margin: 24px 0; text-align: center;">
          <h3 style="color: #166534; margin: 0 0 8px 0; font-size: 15px; font-weight: bold;">
            Tautan Akses & Perbaikan Formulir Anda
          </h3>
          <p style="font-size: 13px; color: #15803d; margin: 0 0 18px 0; line-height: 1.5;">
            Simpan email ini. Anda dapat menggunakan tombol di bawah ini untuk melihat status formulir, memperbarui data diri, atau mengunggah ulang berkas dokumen kapan saja sebelum batas pendaftaran ditutup.
          </p>
          <a href="${editUrl}" style="background-color: #005621; color: #ffffff; padding: 13px 32px; border-radius: 10px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            Buka & Perbaiki Formulir Saya
          </a>
        </div>

        <p style="font-size: 12px; color: #6b7280; line-height: 1.6;">
          Jika tombol di atas tidak dapat diklik, salin dan buka tautan berikut di peramban (browser) web Anda:<br/>
          <a href="${editUrl}" style="color: #005621; word-break: break-all; font-weight: 600;">${editUrl}</a>
        </p>

        <div style="margin-top: 24px; padding: 12px 16px; background-color: #f9fafb; border-radius: 8px; font-size: 12px; color: #4b5563; line-height: 1.5;">
          💡 <strong>Catatan:</strong> Tautan di atas telah memuat akses langsung ke formulir pendaftaran Anda. Anda tidak perlu lagi mengingat atau memasukkan kode token pendaftaran secara manual.
        </div>

        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 28px 0 20px 0;" />
        <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.5;">
          Email ini dikirimkan secara otomatis oleh Sistem Pendaftaran Rumah Amal USK Banda Aceh.<br/>
          Harap tidak membalas langsung ke alamat email ini.
        </p>
      </div>
    `;

    const data = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject: `[Bukti Pendaftaran] ${programName} - Rumah Amal USK`,
      html: htmlContent,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('[Gagal kirim email konfirmasi pendaftaran via Resend]', error);
    return { success: false, error: error.message };
  }
}

/**
 * Mengirim email pengumuman hasil seleksi (Lolos / Tidak Lolos) kepada pendaftar
 */
export async function sendSelectionAnnouncementEmail({
  toEmail,
  applicantName,
  programName,
  isLolos,
  catatan,
}: {
  toEmail: string;
  applicantName: string;
  programName: string;
  isLolos: boolean;
  catatan?: string;
}) {
  const resend = getResendClient();
  const fromEmail = process.env.EMAIL_FROM || 'Rumah Amal USK <onboarding@resend.dev>';
  const subject = isLolos
    ? `[Pengumuman] Selamat! Anda Dinyatakan Lolos Seleksi - ${programName}`
    : `[Pengumuman] Hasil Seleksi Program - ${programName}`;

  if (!resend || !toEmail) {
    console.log(`=======================================================`);
    console.log(`[SIMULASI EMAIL PENGUMUMAN SELEKSI RESEND]`);
    console.log(`Ke: ${toEmail || 'Email tidak terisi'}`);
    console.log(`Nama: ${applicantName}`);
    console.log(`Program: ${programName}`);
    console.log(`Status: ${isLolos ? 'LOLOS SELEKSI' : 'TIDAK LOLOS SELEKSI'}`);
    if (catatan) console.log(`Catatan: ${catatan}`);
    console.log(`=======================================================`);
    return { success: true, simulated: true };
  }

  try {
    const htmlContent = isLolos
      ? `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #d1fae5; border-radius: 16px; color: #1f2937; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
            <h2 style="color: #005621; margin: 0; font-size: 22px; font-weight: 800;">Rumah Amal Masjid Jamik USK</h2>
            <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">Pengumuman Resmi Hasil Seleksi</p>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <span style="background-color: #dcfce7; color: #166534; font-weight: 800; font-size: 12px; padding: 6px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #bbf7d0;">
              ✓ LOLOS SELEKSI
            </span>
          </div>

          <p style="font-size: 15px; line-height: 1.6;">Assalamu'alaikum Wr. Wb. <strong>${applicantName}</strong>,</p>

          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Alhamdulillah, kami mengucapkan <strong>Selamat!</strong> Berdasarkan hasil evaluasi, verifikasi berkas, dan ketentuan yang berlaku, Anda dinyatakan <strong>LOLOS SELEKSI</strong> sebagai penerima manfaat pada program:
          </p>

          <div style="background-color: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 18px; margin: 20px 0; text-align: center;">
            <h3 style="color: #166534; margin: 0; font-size: 17px; font-weight: bold;">
              ${programName}
            </h3>
          </div>

          ${
            catatan
              ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
              <strong style="font-size: 13px; color: #334155;">Catatan / Informasi Khusus dari Tim Rumah Amal:</strong>
              <p style="font-size: 13px; color: #475569; margin: 6px 0 0 0; line-height: 1.5;">${catatan}</p>
            </div>
          `
              : ''
          }

          <p style="font-size: 13px; line-height: 1.6; color: #4b5563;">
            Harap pantau terus pengumuman dan arahan selanjutnya melalui kontak resmi Rumah Amal USK. Pastikan nomor WhatsApp dan email Anda tetap aktif.
          </p>

          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 28px 0 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.5;">
            Email ini dikirimkan secara resmi oleh Panitia Seleksi Rumah Amal USK Banda Aceh.<br/>
            Jl. Teuku Nyak Arief, Komplek Masjid Jamik Universitas Syiah Kuala.
          </p>
        </div>
      `
      : `
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #f3f4f6; border-radius: 16px; color: #1f2937; background-color: #ffffff;">
          <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f3f4f6;">
            <h2 style="color: #005621; margin: 0; font-size: 22px; font-weight: 800;">Rumah Amal Masjid Jamik USK</h2>
            <p style="font-size: 13px; color: #6b7280; margin-top: 4px;">Pengumuman Resmi Hasil Seleksi</p>
          </div>

          <div style="text-align: center; margin-bottom: 24px;">
            <span style="background-color: #f1f5f9; color: #475569; font-weight: 800; font-size: 12px; padding: 6px 16px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid #e2e8f0;">
              HASIL SELEKSI
            </span>
          </div>

          <p style="font-size: 15px; line-height: 1.6;">Assalamu'alaikum Wr. Wb. <strong>${applicantName}</strong>,</p>

          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Terima kasih atas partisipasi dan berkas pendaftaran yang telah Anda ajukan pada program <strong>${programName}</strong> di Rumah Amal USK.
          </p>

          <p style="font-size: 14px; line-height: 1.6; color: #374151;">
            Setelah melalui proses verifikasi dan seleksi yang ketat, serta mempertimbangkan keterbatasan kuota penerima manfaat pada periode ini, dengan berat hati kami menginformasikan bahwa Anda <strong>belum dapat dinyatakan lolos</strong> pada program kali ini.
          </p>

          ${
            catatan
              ? `
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 20px 0;">
              <strong style="font-size: 13px; color: #334155;">Catatan Tim Penilai:</strong>
              <p style="font-size: 13px; color: #475569; margin: 6px 0 0 0; line-height: 1.5;">${catatan}</p>
            </div>
          `
              : ''
          }

          <p style="font-size: 13px; line-height: 1.6; color: #4b5563;">
            Kami sangat mengapresiasi ikhtiar dan antusiasme Anda. Tetap semangat dalam menuntut ilmu dan berkarya, serta jangan berkecil hati untuk mencoba kembali pada program-program Rumah Amal USK di kesempatan mendatang.
          </p>

          <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 28px 0 20px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0; line-height: 1.5;">
            Email ini dikirimkan secara resmi oleh Panitia Seleksi Rumah Amal USK Banda Aceh.<br/>
            Jl. Teuku Nyak Arief, Komplek Masjid Jamik Universitas Syiah Kuala.
          </p>
        </div>
      `;

    const data = await resend.emails.send({
      from: fromEmail,
      to: [toEmail],
      subject,
      html: htmlContent,
    });

    return { success: true, data };
  } catch (error: any) {
    console.error('[Gagal kirim email pengumuman seleksi via Resend]', error);
    return { success: false, error: error.message };
  }
}

