import type { DataSource, Invoice, Unit, UnitSize, UnitStatus } from '../types';
import { mapping, SIZE_DEFAULTS } from '@/config/mapping';
import { creatorApp, getAllRecords, plain, updateRecord, type CreatorRecord } from '../zoho/creator';
import * as books from '../zoho/books';
import { parseAnyDate, toCreatorDate } from '../dates';

const F = mapping.fields;
const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

function matchValue<K extends string>(value: string | undefined, table: Record<K, string[]>): K | undefined {
  if (!value) return undefined;
  const v = norm(value);
  for (const [k, list] of Object.entries(table) as [K, string[]][]) if (list.some((x) => norm(x) === v)) return k;
  for (const [k, list] of Object.entries(table) as [K, string[]][]) if (list.some((x) => v.includes(norm(x)))) return k;
  return undefined;
}

function toNumber(v: unknown): number | undefined {
  const s = plain(v);
  if (s == null) return undefined;
  const n = Number(s.replace(/[^\d.\-]/g, ''));
  return Number.isFinite(n) ? n : undefined;
}

function toUnit(r: CreatorRecord): Unit {
  const sizeRaw = plain(r[F.size]);
  const size: UnitSize = matchValue(sizeRaw, mapping.sizeValues) ?? 'medium';
  const status: UnitStatus = matchValue(plain(r[F.status]), mapping.statusValues) ?? 'available';
  const d = SIZE_DEFAULTS[size];
  const code = plain(r[F.code]) ?? r.ID;
  return {
    id: String(r.ID),
    code,
    zone: plain(r[F.zone]) ?? code.split(/[-\s]/)[0] ?? 'A',
    branch: plain(r[F.branch]) ?? 'الفرع الرئيسي',
    floor: plain(r[F.floor]) ?? 'أرضي',
    size,
    widthM: toNumber(r[F.widthM]) ?? d.widthM,
    depthM: toNumber(r[F.depthM]) ?? d.depthM,
    x: toNumber(r[F.x]),
    y: toNumber(r[F.y]),
    status,
    monthlyPrice: toNumber(r[F.price]) ?? 0,
    customerName: plain(r[F.customerName]),
    customerPhone: plain(r[F.customerPhone]),
    contractStart: parseAnyDate(plain(r[F.contractStart])),
    contractEnd: parseAnyDate(plain(r[F.contractEnd])),
    notes: plain(r[F.notes]),
  };
}

function toCreatorPatch(patch: Partial<Unit>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const set = (field: string, v: unknown) => { if (field) out[field] = v ?? ''; };
  if ('status' in patch && patch.status) set(F.status, mapping.statusValues[patch.status][0]);
  if ('customerName' in patch) set(F.customerName, patch.customerName);
  if ('customerPhone' in patch) set(F.customerPhone, patch.customerPhone);
  if ('contractStart' in patch) set(F.contractStart, patch.contractStart ? toCreatorDate(patch.contractStart) : '');
  if ('contractEnd' in patch) set(F.contractEnd, patch.contractEnd ? toCreatorDate(patch.contractEnd) : '');
  if ('monthlyPrice' in patch) set(F.price, patch.monthlyPrice);
  if ('notes' in patch) set(F.notes, patch.notes);
  return out;
}

/** كاش قصير لتخفيف الضغط على حدود Zoho (Books: ~100 طلب/دقيقة) */
const TTL = Number(process.env.ZOHO_CACHE_SECONDS ?? 60) * 1000;
const cache = globalThis as unknown as { __zc?: Map<string, { at: number; v: Promise<unknown> }> };
function cached<T>(key: string, fn: () => Promise<T>): Promise<T> {
  cache.__zc ??= new Map();
  const hit = cache.__zc.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.v as Promise<T>;
  const v = fn().catch((e) => { cache.__zc!.delete(key); throw e; });
  cache.__zc.set(key, { at: Date.now(), v });
  return v;
}
const bust = (key: string) => cache.__zc?.delete(key);

export const zohoSource: DataSource = {
  mode: 'zoho',
  listUnits() {
    return cached('units', async () => {
      const { owner, app, report } = creatorApp();
      return (await getAllRecords(owner, app, report)).map(toUnit);
    });
  },
  listInvoices() {
    return cached<Invoice[]>('invoices', () => books.listInvoices());
  },
  async updateUnit(id, patch) {
    const { owner, app, report } = creatorApp();
    const data = toCreatorPatch(patch);
    if (Object.keys(data).length) await updateRecord(owner, app, report, id, data);
    bust('units');
  },
  async createInvoice(input) {
    const customerId = await books.findOrCreateContact(input.customerName, input.customerPhone);
    const inv = await books.createInvoice({ customerId, ...input });
    bust('invoices');
    return {
      id: String(inv.invoice_id), number: inv.invoice_number, customerName: inv.customer_name,
      unitCode: input.unitCode, date: inv.date, dueDate: inv.due_date,
      total: Number(inv.total), balance: Number(inv.balance), status: 'sent', url: inv.invoice_url,
    };
  },
};
