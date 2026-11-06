import { NextResponse } from 'next/server';
import { apiError, loadAll } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { mode, units } = await loadAll();
    return NextResponse.json({ mode, units, at: new Date().toISOString() });
  } catch (e) { return apiError(e); }
}
