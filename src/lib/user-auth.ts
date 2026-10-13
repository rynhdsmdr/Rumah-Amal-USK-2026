'use server';

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { verifyProfileIdentityDocuments } from '@/lib/verification-pipeline';

const SESSION_COOKIE_NAME = 'ra_user_session';
const SESSION_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || 'rumah-amal-session-key-2026';

export type UserSessionData = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  kelompok: 'MAHASISWA_USK' | 'DOSEN_STAFF_USK' | 'MASYARAKAT_UMUM' | null;
  isProfileCompleted: boolean;
};

// =======================================================================
// HELPER SIGNATURE COOKIE
// =======================================================================

function signSession(payload: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('base64url');
  return `${payload}.${signature}`;
}

function verifySession(token: string): string | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('base64url');
  if (signature !== expectedSig) return null;
  return payload;
}

// =======================================================================
// DETEKSI KELOMPOK DARI DOMAIN EMAIL
// =======================================================================

export async function detectEmailKelompok(email: string) {
  const clean = email.trim().toLowerCase();
  if (clean.endsWith('@mhs.usk.ac.id')) {
    return {
      kelompok: 'MAHASISWA_USK' as const,
      isLocked: true,
      availableOptions: [{ id: 'MAHASISWA_USK', label: 'Mahasiswa USK' }],
    };
  }
  if (clean.endsWith('@usk.ac.id')) {
    return {
      kelompok: 'DOSEN_STAFF_USK' as const,
      isLocked: true,
      availableOptions: [{ id: 'DOSEN_STAFF_USK', label: 'Dosen / Staff USK' }],
    };
  }
  return {
    kelompok: 'MASYARAKAT_UMUM' as const,
    isLocked: false,
    availableOptions: [
      { id: 'MAHASISWA_USK', label: 'Mahasiswa USK' },
      { id: 'DOSEN_STAFF_USK', label: 'Dosen / Staff USK' },
      { id: 'MASYARAKAT_UMUM', label: 'Masyarakat Umum' },
    ],
  };
}

// =======================================================================
// GET / SET / CLEAR SESSION
// =======================================================================

export async function getUserSession(): Promise<UserSessionData | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const rawPayload = verifySession(token);
  if (!rawPayload) return null;

  try {
    const data = JSON.parse(Buffer.from(rawPayload, 'base64url').toString('utf8')) as UserSessionData;
    // Sinkronkan data profil terbaru dari database
    const user = await prisma.userAccount.findUnique({
      where: { id: data.id },
      include: { profile: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      kelompok: (user.profile?.kelompok as any) || null,
      isProfileCompleted: user.profile?.isCompleted || false,
    };
  } catch {
    return null;
  }
}

async function setSessionCookie(user: { id: string; email: string; name: string | null; image: string | null; profile?: any }) {
  const sessionData: UserSessionData = {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    kelompok: user.profile?.kelompok || null,
    isProfileCompleted: user.profile?.isCompleted || false,
  };

  const jsonStr = JSON.stringify(sessionData);
  const base64Payload = Buffer.from(jsonStr, 'utf8').toString('base64url');
  const signedToken = signSession(base64Payload);

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, signedToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 hari
  });
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return { success: true };
}

// =======================================================================
// LOGIN & REGISTER ACTIONS
// =======================================================================

export async function loginOrRegisterGoogle(payload: { email: string; name?: string; image?: string }) {
  try {
    const cleanEmail = payload.email.trim().toLowerCase();
    let user = await prisma.userAccount.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    });

    if (!user) {
      user = await prisma.userAccount.create({
        data: {
          email: cleanEmail,
          name: payload.name?.trim() || cleanEmail.split('@')[0],
          image: payload.image || null,
          provider: 'google',
        },
        include: { profile: true },
      });
    }

    await setSessionCookie(user);

    return {
      success: true,
      needsOnboarding: !user.profile || !user.profile.isCompleted,
    };
  } catch (error: any) {
    console.error('[loginOrRegisterGoogle error]', error);
    return { success: false, error: error.message || 'Gagal masuk lewat Google.' };
  }
}

export async function loginManual(formData: { email: string; password?: string }) {
  try {
    const cleanEmail = formData.email.trim().toLowerCase();
    const password = formData.password || '';

    const user = await prisma.userAccount.findUnique({
      where: { email: cleanEmail },
      include: { profile: true },
    });

    if (!user) {
      return { success: false, error: 'Akun dengan email ini belum terdaftar. Silakan daftar terlebih dahulu.' };
    }

    if (user.passwordHash) {
      const match = await bcrypt.compare(password, user.passwordHash);
      if (!match) {
        return { success: false, error: 'Kata sandi tidak sesuai.' };
      }
    }

    await setSessionCookie(user);

    return {
      success: true,
      needsOnboarding: !user.profile || !user.profile.isCompleted,
    };
  } catch (error: any) {
    console.error('[loginManual error]', error);
    return { success: false, error: error.message || 'Gagal masuk ke akun.' };
  }
}

export async function registerManual(formData: { email: string; password?: string; name?: string }) {
  try {
    const cleanEmail = formData.email.trim().toLowerCase();
    const password = formData.password || '';

    const existing = await prisma.userAccount.findUnique({
      where: { email: cleanEmail },
    });

    if (existing) {
      return { success: false, error: 'Email ini sudah terdaftar. Silakan langsung masuk.' };
    }

    const passwordHash = password ? await bcrypt.hash(password, 10) : null;

    const user = await prisma.userAccount.create({
      data: {
        email: cleanEmail,
        name: formData.name?.trim() || null,
        passwordHash,
        provider: 'manual',
      },
      include: { profile: true },
    });

    await setSessionCookie(user);

    return {
      success: true,
      needsOnboarding: true,
    };
  } catch (error: any) {
    console.error('[registerManual error]', error);
    return { success: false, error: error.message || 'Gagal mendaftar akun.' };
  }
}

// =======================================================================
// SINGLE IDENTITY PROFILE MANAGEMENT
// =======================================================================

export async function getFullUserProfile() {
  const session = await getUserSession();
  if (!session) return null;

  const [profile, submissionsCount] = await Promise.all([
    prisma.userProfile.findUnique({
      where: { userAccountId: session.id },
    }),
    prisma.submission.count({
      where: { userAccountId: session.id },
    }),
  ]);

  return {
    user: session,
    profile,
    submissionsCount,
    hasSubmissions: submissionsCount > 0,
  };
}

export async function saveSingleIdentityProfile(data: {
  kelompok: 'MAHASISWA_USK' | 'DOSEN_STAFF_USK' | 'MASYARAKAT_UMUM';
  namaLengkap: string;
  nik: string;
  noWa: string;
  npm?: string;
  fakultas?: string;
  prodi?: string;
  nip?: string;
  unitKerja?: string;
  alamat?: string;
  pekerjaan?: string;
  ktpUrl?: string;
  ktmUrl?: string;
  kartuPegawaiUrl?: string;
  kkUrl?: string;
}) {
  const session = await getUserSession();
  if (!session) {
    return { success: false, error: 'Sesi login telah berakhir. Silakan masuk kembali.' };
  }

  try {
    const cleanEmail = session.email.toLowerCase().trim();
    let finalKelompok = data.kelompok;
    if (cleanEmail.endsWith('@mhs.usk.ac.id')) {
      finalKelompok = 'MAHASISWA_USK';
    } else if (cleanEmail.endsWith('@usk.ac.id')) {
      finalKelompok = 'DOSEN_STAFF_USK';
    }

    // 1. Cek Submission Lock (Kunci Total jika sudah pernah mendaftar program)
    const [existingProfile, submissionsCount] = await Promise.all([
      prisma.userProfile.findUnique({ where: { userAccountId: session.id } }),
      prisma.submission.count({ where: { userAccountId: session.id } }),
    ]);

    const hasSubmissions = submissionsCount > 0;

    // Jika akun sudah memiliki minimal 1 riwayat pendaftaran:
    // Seluruh biodata pokok (Nama, NIK, NPM, Kelompok) & berkas identitas DIKUNCI TOTAL (FREEZE).
    // Hanya nomor WhatsApp dan alamat domisili yang diizinkan untuk diperbarui.
    if (hasSubmissions && existingProfile) {
      const updatedProfile = await prisma.userProfile.update({
        where: { userAccountId: session.id },
        data: {
          noWa: data.noWa.trim(),
          alamat: data.alamat?.trim() || existingProfile.alamat,
          pekerjaan: data.pekerjaan?.trim() || existingProfile.pekerjaan,
        },
      });
      return {
        success: true,
        profile: updatedProfile,
        isLockedFreeze: true,
        message: 'Kontak WhatsApp & Alamat berhasil diperbarui. Data pokok dan berkas tetap terkunci permanen karena akun telah memiliki riwayat pendaftaran.',
      };
    }

    // 2. Pilar A: Unique Constraint NIK & NPM (1 NIK = 1 Orang, 1 NPM = 1 Mahasiswa)
    const cleanNik = data.nik.trim();
    if (!/^\d{16}$/.test(cleanNik)) {
      return { success: false, error: 'NIK harus berupa 16 digit angka resmi sesuai KTP.' };
    }

    const existingNikUser = await prisma.userProfile.findFirst({
      where: {
        nik: cleanNik,
        userAccountId: { not: session.id },
      },
    });
    if (existingNikUser) {
      return {
        success: false,
        error: `NIK "${cleanNik}" sudah pernah terdaftar pada akun lain. Satu NIK hanya dapat didaftarkan untuk satu akun resmi Rumah Amal USK demi mencegah duplikasi identitas.`,
      };
    }

    if (finalKelompok === 'MAHASISWA_USK' && data.npm && data.npm.trim()) {
      const cleanNpm = data.npm.trim();
      const existingNpmUser = await prisma.userProfile.findFirst({
        where: {
          npm: cleanNpm,
          userAccountId: { not: session.id },
        },
      });
      if (existingNpmUser) {
        return {
          success: false,
          error: `NPM "${cleanNpm}" sudah pernah terdaftar pada akun mahasiswa lain. Satu NPM hanya berlaku untuk satu akun mahasiswa resmi.`,
        };
      }
    }

    // 3. Pilar Rencana Automasi Verifikasi Berkas (OCR + Matching)
    // Jalankan pemeriksaan kesesuaian berkas saat tombol simpan ditekan
    if (data.ktpUrl || data.ktmUrl) {
      const docVerification = await verifyProfileIdentityDocuments({
        namaLengkap: data.namaLengkap.trim(),
        nik: cleanNik,
        npm: data.npm?.trim(),
        kelompok: finalKelompok,
        ktpUrl: data.ktpUrl?.trim(),
        ktmUrl: data.ktmUrl?.trim(),
      });

      if (!docVerification.isValid) {
        return {
          success: false,
          error: docVerification.error || 'Data NIK/NPM atau Nama Lengkap tidak sesuai dengan dokumen identitas yang diunggah. Harap periksa kembali berkas Anda sebelum menyimpan.',
        };
      }
    }

    // 4. Simpan Profil & Kunci
    const profile = await prisma.userProfile.upsert({
      where: { userAccountId: session.id },
      create: {
        userAccountId: session.id,
        kelompok: finalKelompok,
        namaLengkap: data.namaLengkap.trim(),
        nik: cleanNik,
        noWa: data.noWa.trim(),
        npm: data.npm?.trim() || null,
        fakultas: data.fakultas?.trim() || null,
        prodi: data.prodi?.trim() || null,
        nip: data.nip?.trim() || null,
        unitKerja: data.unitKerja?.trim() || null,
        alamat: data.alamat?.trim() || null,
        pekerjaan: data.pekerjaan?.trim() || null,
        ktpUrl: data.ktpUrl?.trim() || null,
        ktmUrl: data.ktmUrl?.trim() || null,
        kartuPegawaiUrl: data.kartuPegawaiUrl?.trim() || null,
        kkUrl: data.kkUrl?.trim() || null,
        isCompleted: true,
      },
      update: {
        kelompok: finalKelompok,
        namaLengkap: data.namaLengkap.trim(),
        nik: cleanNik,
        noWa: data.noWa.trim(),
        npm: data.npm?.trim() || null,
        fakultas: data.fakultas?.trim() || null,
        prodi: data.prodi?.trim() || null,
        nip: data.nip?.trim() || null,
        unitKerja: data.unitKerja?.trim() || null,
        alamat: data.alamat?.trim() || null,
        pekerjaan: data.pekerjaan?.trim() || null,
        ktpUrl: data.ktpUrl?.trim() || null,
        ktmUrl: data.ktmUrl?.trim() || null,
        kartuPegawaiUrl: data.kartuPegawaiUrl?.trim() || null,
        kkUrl: data.kkUrl?.trim() || null,
        isCompleted: true,
      },
    });

    // Perbarui nama di tabel akun
    await prisma.userAccount.update({
      where: { id: session.id },
      data: { name: data.namaLengkap.trim() },
    });

    return { success: true, profile };
  } catch (error: any) {
    console.error('[saveSingleIdentityProfile error]', error);
    return { success: false, error: error.message || 'Gagal menyimpan profil biodata.' };
  }
}

