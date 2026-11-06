import { NextResponse } from 'next/server';
import { listApplications, listFields, listForms, listReports } from '@/lib/zoho/creator';
import { apiError } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** يساعد على معرفة أسماء التطبيق والتقارير والحقول في Creator بدون تخمين */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const owner = q.get('owner'), app = q.get('app'), form = q.get('form');
  try {
    if (owner && app && form) return NextResponse.json({ fields: await listFields(owner, app, form) });
    if (owner && app) {
      const [forms, reports] = await Promise.all([listForms(owner, app), listReports(owner, app)]);
      return NextResponse.json({ forms, reports });
    }
    return NextResponse.json({ applications: await listApplications() });
  } catch (e) { return apiError(e, 400); }
}
