import { NextResponse } from 'next/server';
import { apiError, loadAll } from '@/lib/api';
import { computeKpis } from '@/lib/kpis';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { mode, units, invoices } = await loadAll();
    return NextResponse.json({ mode, kpis: computeKpis(units, invoices) });
  } catch (e) { return apiError(e); }
}
