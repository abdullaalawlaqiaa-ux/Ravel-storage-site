import { NextResponse } from 'next/server';
import { getDataSource } from '@/lib/data';
import { apiError } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const ds = getDataSource();
    return NextResponse.json({ mode: ds.mode, invoices: await ds.listInvoices() });
  } catch (e) { return apiError(e); }
}
