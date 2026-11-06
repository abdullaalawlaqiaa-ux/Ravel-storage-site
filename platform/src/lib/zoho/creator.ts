import { zohoFetch } from './auth';

const BASE = '/creator/v2.1';

export function creatorApp() {
  const owner = process.env.ZOHO_CREATOR_OWNER;
  const app = process.env.ZOHO_CREATOR_APP;
  const report = process.env.ZOHO_CREATOR_UNITS_REPORT;
  if (!owner || !app || !report) {
    throw new Error('حدّد ZOHO_CREATOR_OWNER و ZOHO_CREATOR_APP و ZOHO_CREATOR_UNITS_REPORT (تجدها في صفحة الإعدادات ← اكتشاف)');
  }
  return { owner, app, report };
}

export type CreatorRecord = Record<string, unknown> & { ID: string };

/** يجلب كل السجلات من تقرير مع التنقّل بين الصفحات (record_cursor) */
export async function getAllRecords(owner: string, app: string, report: string, max = 5000): Promise<CreatorRecord[]> {
  const out: CreatorRecord[] = [];
  let cursor: string | null = null;
  do {
    const res: { data: { data?: CreatorRecord[] }; headers: Headers } = await zohoFetch<{ data?: CreatorRecord[] }>(
      `${BASE}/data/${owner}/${app}/report/${report}`,
      { query: { max_records: 1000 }, headers: cursor ? { record_cursor: cursor } : {} },
    );
    out.push(...(res.data.data ?? []));
    cursor = res.headers.get('record_cursor');
  } while (cursor && out.length < max);
  return out;
}

export async function updateRecord(owner: string, app: string, report: string, id: string, data: Record<string, unknown>) {
  const { data: res } = await zohoFetch(`${BASE}/data/${owner}/${app}/report/${report}/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ data }),
  });
  return res;
}

export async function listApplications() {
  const { data } = await zohoFetch<{ applications?: any[] }>(`${BASE}/meta/applications`);
  return (data.applications ?? []).map((a) => ({
    name: a.application_name as string,
    linkName: a.link_name as string,
    owner: (a.workspace_name ?? a.created_by) as string,
  }));
}

export async function listReports(owner: string, app: string) {
  const { data } = await zohoFetch<{ reports?: any[] }>(`${BASE}/meta/${owner}/${app}/reports`);
  return (data.reports ?? []).map((r) => ({ name: r.display_name as string, linkName: r.link_name as string }));
}

export async function listForms(owner: string, app: string) {
  const { data } = await zohoFetch<{ forms?: any[] }>(`${BASE}/meta/${owner}/${app}/forms`);
  return (data.forms ?? []).map((f) => ({ name: f.display_name as string, linkName: f.link_name as string }));
}

export async function listFields(owner: string, app: string, form: string) {
  const { data } = await zohoFetch<{ fields?: any[] }>(`${BASE}/meta/${owner}/${app}/form/${form}/fields`);
  return (data.fields ?? []).map((f) => ({ name: f.display_name as string, linkName: f.link_name as string, type: f.type }));
}

/** قيمة حقل Creator قد تكون نصاً أو كائن lookup مثل {display_value, ID} */
export function plain(v: unknown): string | undefined {
  if (v == null) return undefined;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    if ('display_value' in o) return String(o.display_value ?? '');
    if ('zc_display_value' in o) return String(o.zc_display_value ?? '');
    if (Array.isArray(v)) return v.map(plain).filter(Boolean).join('، ');
    return undefined;
  }
  const s = String(v).trim();
  return s === '' ? undefined : s;
}
