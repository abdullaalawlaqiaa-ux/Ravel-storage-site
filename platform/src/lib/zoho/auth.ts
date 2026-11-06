/**
 * مصادقة Zoho OAuth مع اكتشاف المنطقة (Data Center) تلقائياً.
 * إذا لم يُحدَّد ZOHO_DC نجرّب كل المناطق حتى ينجح تجديد التوكن،
 * ونستخدم api_domain الذي يرجعه Zoho لكل الطلبات بعدها.
 */
export const ZOHO_DCS: { key: string; label: string; accounts: string; api: string }[] = [
  { key: 'com', label: 'أمريكا (zoho.com)', accounts: 'https://accounts.zoho.com', api: 'https://www.zohoapis.com' },
  { key: 'sa', label: 'السعودية (zoho.sa)', accounts: 'https://accounts.zoho.sa', api: 'https://www.zohoapis.sa' },
  { key: 'eu', label: 'أوروبا (zoho.eu)', accounts: 'https://accounts.zoho.eu', api: 'https://www.zohoapis.eu' },
  { key: 'in', label: 'الهند (zoho.in)', accounts: 'https://accounts.zoho.in', api: 'https://www.zohoapis.in' },
  { key: 'com.au', label: 'أستراليا (zoho.com.au)', accounts: 'https://accounts.zoho.com.au', api: 'https://www.zohoapis.com.au' },
  { key: 'uk', label: 'بريطانيا (zoho.uk)', accounts: 'https://accounts.zoho.uk', api: 'https://www.zohoapis.uk' },
  { key: 'jp', label: 'اليابان (zoho.jp)', accounts: 'https://accounts.zoho.jp', api: 'https://www.zohoapis.jp' },
  { key: 'ca', label: 'كندا (zohocloud.ca)', accounts: 'https://accounts.zohocloud.ca', api: 'https://www.zohoapis.ca' },
  { key: 'com.cn', label: 'الصين (zoho.com.cn)', accounts: 'https://accounts.zoho.com.cn', api: 'https://www.zohoapis.com.cn' },
];

export const REQUIRED_SCOPES = [
  'ZohoCreator.report.READ',
  'ZohoCreator.report.UPDATE',
  'ZohoCreator.meta.application.READ',
  'ZohoCreator.meta.form.READ',
  'ZohoBooks.invoices.ALL',
  'ZohoBooks.contacts.ALL',
  'ZohoBooks.settings.READ',
];

interface TokenState {
  accessToken: string;
  apiDomain: string;
  dc: string;
  expiresAt: number;
}

const g = globalThis as unknown as { __zohoToken?: TokenState; __zohoTokenPending?: Promise<TokenState> };

export function zohoConfigured(): boolean {
  return Boolean(process.env.ZOHO_CLIENT_ID && process.env.ZOHO_CLIENT_SECRET && process.env.ZOHO_REFRESH_TOKEN);
}

function candidateDcs() {
  const fixed = process.env.ZOHO_DC?.trim();
  if (fixed) {
    const dc = ZOHO_DCS.find((d) => d.key === fixed);
    if (!dc) throw new Error(`ZOHO_DC غير معروف: ${fixed}`);
    return [dc];
  }
  return ZOHO_DCS;
}

type TokenResponse = { access_token?: string; api_domain?: string; expires_in?: number; refresh_token?: string; error?: string };

async function tokenRequest(accounts: string, params: Record<string, string>): Promise<TokenResponse> {
  let res: Response;
  try {
    res = await fetch(`${accounts}/oauth/v2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(params).toString(),
      cache: 'no-store',
      signal: AbortSignal.timeout(10_000),
    });
  } catch (e) {
    return { error: `network: ${(e as Error).message}` };
  }
  try {
    return (await res.json()) as TokenResponse;
  } catch {
    return { error: `HTTP ${res.status}` };
  }
}

async function refresh(): Promise<TokenState> {
  const errors: string[] = [];
  const prev = g.__zohoToken?.dc;
  const dcs = candidateDcs().slice().sort((a, b) => (a.key === prev ? -1 : b.key === prev ? 1 : 0));
  for (const dc of dcs) {
    const r = await tokenRequest(dc.accounts, {
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
      client_id: process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    });
    if (r.access_token) {
      return {
        accessToken: r.access_token,
        apiDomain: r.api_domain || dc.api,
        dc: dc.key,
        expiresAt: Date.now() + ((r.expires_in ?? 3600) - 120) * 1000,
      };
    }
    errors.push(`${dc.key}: ${r.error ?? 'unknown'}`);
  }
  throw new Error(`تعذّر تجديد توكن Zoho في كل المناطق – تأكد من المفاتيح. (${errors.join(' | ')})`);
}

export async function getToken(): Promise<TokenState> {
  if (!zohoConfigured()) throw new Error('مفاتيح Zoho غير مضبوطة');
  const t = g.__zohoToken;
  if (t && t.expiresAt > Date.now()) return t;
  if (!g.__zohoTokenPending) {
    g.__zohoTokenPending = refresh()
      .then((s) => (g.__zohoToken = s))
      .finally(() => (g.__zohoTokenPending = undefined));
  }
  return g.__zohoTokenPending;
}

export function invalidateToken() {
  g.__zohoToken = undefined;
}

/** تحويل Grant Code (من Self Client) إلى Refresh Token – مع تجربة كل المناطق */
export async function exchangeGrantCode(clientId: string, clientSecret: string, code: string) {
  const errors: string[] = [];
  for (const dc of ZOHO_DCS) {
    const r = await tokenRequest(dc.accounts, {
      code, client_id: clientId, client_secret: clientSecret, grant_type: 'authorization_code',
    });
    if (r.refresh_token) return { refreshToken: r.refresh_token, dc: dc.key, apiDomain: r.api_domain || dc.api };
    errors.push(`${dc.key}: ${r.error ?? 'unknown'}`);
  }
  throw new Error(`فشل التحويل: ${errors.join(' | ')}`);
}

export class ZohoApiError extends Error {
  constructor(message: string, public status: number, public body: unknown) {
    super(message);
  }
}

/** طلب موحّد لأي API من Zoho باستخدام api_domain الصحيح */
export async function zohoFetch<T = any>(
  path: string,
  init: RequestInit & { query?: Record<string, string | number | undefined> } = {},
  retry = true,
): Promise<{ data: T; headers: Headers }> {
  const tok = await getToken();
  const url = new URL(tok.apiDomain + path);
  for (const [k, v] of Object.entries(init.query ?? {})) if (v !== undefined) url.searchParams.set(k, String(v));
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Zoho-oauthtoken ${tok.accessToken}`,
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (res.status === 401 && retry) {
    invalidateToken();
    return zohoFetch<T>(path, init, false);
  }
  const text = await res.text();
  let body: any = text;
  try { body = text ? JSON.parse(text) : {}; } catch { /* keep text */ }
  if (!res.ok) {
    const msg = body?.message || body?.description || body?.error?.message || `HTTP ${res.status}`;
    throw new ZohoApiError(`Zoho: ${msg}`, res.status, body);
  }
  return { data: body as T, headers: res.headers };
}
