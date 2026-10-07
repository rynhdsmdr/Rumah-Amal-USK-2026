import { NextResponse } from 'next/server';
import { getUserSession, logoutUser } from '@/lib/user-auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const session = await getUserSession();
    return NextResponse.json({
      loggedIn: !!session,
      user: session,
    });
  } catch (err: any) {
    return NextResponse.json({ loggedIn: false, user: null, error: err.message }, { status: 500 });
  }
}

export async function POST() {
  try {
    await logoutUser();
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
