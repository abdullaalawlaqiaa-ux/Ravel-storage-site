import { NextResponse, type NextRequest } from 'next/server';
import { authRequired, safeEqual, SESSION_COOKIE, sessionToken } from './lib/session';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname === '/login' || pathname === '/api/login') return NextResponse.next();
  if (!authRequired()) return NextResponse.next();

  const expected = await sessionToken();
  const got = req.cookies.get(SESSION_COOKIE)?.value;
  if (expected && got && safeEqual(got, expected)) return NextResponse.next();

  if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'غير مصرّح' }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = `?next=${encodeURIComponent(pathname)}`;
  return NextResponse.redirect(url);
}

export const config = { matcher: ['/((?!_next/|favicon.ico).*)'] };
