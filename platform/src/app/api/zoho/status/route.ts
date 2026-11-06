import { NextResponse } from 'next/server';
import { getToken, ZOHO_DCS, zohoConfigured } from '@/lib/zoho/auth';
import { listOrganizations } from '@/lib/zoho/books';
import { getDataSource } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET() {
  const mode = getDataSource().mode;
  if (!zohoConfigured()) return NextResponse.json({ mode, configured: false });
  const out: Record<string, unknown> = { mode, configured: true };
  try {
    const t = await getToken();
    out.dc = t.dc;
    out.dcLabel = ZOHO_DCS.find((d) => d.key === t.dc)?.label;
    out.apiDomain = t.apiDomain;
    out.auth = 'ok';
  } catch (e) {
    out.auth = (e as Error).message;
    return NextResponse.json(out);
  }
  try {
    out.organizations = await listOrganizations();
    out.books = 'ok';
  } catch (e) { out.books = (e as Error).message; }
  out.creator = process.env.ZOHO_CREATOR_OWNER && process.env.ZOHO_CREATOR_APP && process.env.ZOHO_CREATOR_UNITS_REPORT
    ? { owner: process.env.ZOHO_CREATOR_OWNER, app: process.env.ZOHO_CREATOR_APP, report: process.env.ZOHO_CREATOR_UNITS_REPORT }
    : 'missing';
  return NextResponse.json(out);
}
