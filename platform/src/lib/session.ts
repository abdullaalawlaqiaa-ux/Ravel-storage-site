export const SESSION_COOKIE = 'rv_session';

/** يعمل في Edge و Node (Web Crypto) */
export async function sessionToken(): Promise<string | null> {
  const secret = process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD;
  if (!secret) return null;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode('ravel-admin-v1:' + (process.env.ADMIN_PASSWORD ?? '')));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function authRequired() {
  return Boolean(process.env.ADMIN_PASSWORD) || process.env.NODE_ENV === 'production';
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
