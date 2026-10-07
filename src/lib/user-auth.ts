'use server';

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

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
        name: formData.name?.trim() || cleanEmail.split('@')[0],
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

  const profile = await prisma.userProfile.findUnique({
    where: { userAccountId: session.id },
  });

  return {
    user: session,
    profile,
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
    const profile = await prisma.userProfile.upsert({
      where: { userAccountId: session.id },
      create: {
        userAccountId: session.id,
        kelompok: data.kelompok,
        namaLengkap: data.namaLengkap.trim(),
        nik: data.nik.trim(),
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
        kelompok: data.kelompok,
        namaLengkap: data.namaLengkap.trim(),
        nik: data.nik.trim(),
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

    // Perbarui nama di tabel akun jika ada
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
