import { NextResponse } from 'next/server';
import { getDataSource } from './data';
import { enrichUnits } from './enrich';

export async function loadAll() {
  const ds = getDataSource();
  const [units, invoices] = await Promise.all([ds.listUnits(), ds.listInvoices()]);
  return { ds, mode: ds.mode, units: enrichUnits(units, invoices), invoices };
}

export function apiError(e: unknown, status = 500) {
  const message = e instanceof Error ? e.message : String(e);
  console.error('[api]', message);
  return NextResponse.json({ error: message }, { status });
}
