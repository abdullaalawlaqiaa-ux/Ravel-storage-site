import { NextResponse } from 'next/server';
import { safeEqual, SESSION_COOKIE, sessionToken } from '@/lib/session';

export async function POST(req: Request) {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return NextResponse.json({ error: 'ضع ADMIN_PASSWORD في متغيرات البيئة أولاً' }, { status: 503 });
  const { password } = await req.json().catch(() => ({ password: '' }));
  if (typeof password !== 'string' || !safeEqual(password, pw)) {
    await new Promise((r) => setTimeout(r, 600));
    return NextResponse.json({ error: 'كلمة المرور غير صحيحة' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, (await sessionToken())!, {
    httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
