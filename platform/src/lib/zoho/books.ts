import { zohoFetch } from './auth';
import type { Invoice, InvoiceStatus } from '../types';

const BASE = '/books/v3';
const g = globalThis as unknown as { __booksOrg?: string };

export async function listOrganizations() {
  const { data } = await zohoFetch<{ organizations?: any[] }>(`${BASE}/organizations`);
  return (data.organizations ?? []).map((o) => ({
    id: String(o.organization_id), name: o.name as string, currency: o.currency_code as string, isDefault: !!o.is_default_org,
  }));
}

export async function orgId(): Promise<string> {
  if (process.env.ZOHO_BOOKS_ORG_ID) return process.env.ZOHO_BOOKS_ORG_ID;
  if (g.__booksOrg) return g.__booksOrg;
  const orgs = await listOrganizations();
  const o = orgs.find((x) => x.isDefault) ?? orgs[0];
  if (!o) throw new Error('لا توجد منظمة في Zoho Books');
  return (g.__booksOrg = o.id);
}

function mapStatus(s: string): InvoiceStatus {
  const v = (s || '').toLowerCase();
  if (v === 'paid') return 'paid';
  if (v === 'overdue') return 'overdue';
  if (v === 'partially_paid') return 'partially_paid';
  if (v === 'void') return 'void';
  if (v === 'draft') return 'draft';
  if (v === 'sent' || v === 'viewed') return 'sent';
  return 'unpaid';
}

/**
 * رقم الوحدة يُقرأ من reference_number في الفاتورة (هكذا ننشئها نحن).
 * للفواتير القديمة: نحاول التقاط نمط مثل A-12 من الحقل المرجعي.
 */
function unitFrom(inv: any): string | undefined {
  const field = process.env.ZOHO_BOOKS_UNIT_FIELD || 'reference_number';
  const raw = String(inv[field] ?? '').trim();
  return raw || undefined;
}

export async function listInvoices(maxPages = 10): Promise<Invoice[]> {
  const org = await orgId();
  const out: Invoice[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const { data } = await zohoFetch<{ invoices?: any[]; page_context?: { has_more_page?: boolean } }>(
      `${BASE}/invoices`,
      { query: { organization_id: org, per_page: 200, page, sort_column: 'date', sort_order: 'D' } },
    );
    for (const i of data.invoices ?? []) {
      out.push({
        id: String(i.invoice_id),
        number: i.invoice_number,
        customerName: i.customer_name,
        unitCode: unitFrom(i),
        date: i.date,
        dueDate: i.due_date,
        total: Number(i.total ?? 0),
        balance: Number(i.balance ?? 0),
        status: mapStatus(i.status),
        url: i.invoice_url,
      });
    }
    if (!data.page_context?.has_more_page) break;
  }
  return out;
}

export async function findOrCreateContact(name: string, phone?: string): Promise<string> {
  const org = await orgId();
  const { data } = await zohoFetch<{ contacts?: any[] }>(`${BASE}/contacts`, {
    query: { organization_id: org, contact_name: name, contact_type: 'customer' },
  });
  const hit = (data.contacts ?? []).find((c) => String(c.contact_name).trim() === name.trim());
  if (hit) return String(hit.contact_id);
  const { data: created } = await zohoFetch<{ contact: any }>(`${BASE}/contacts`, {
    method: 'POST',
    query: { organization_id: org },
    body: JSON.stringify({
      contact_name: name,
      contact_type: 'customer',
      ...(phone ? { contact_persons: [{ first_name: name, mobile: phone, is_primary_contact: true }] } : {}),
    }),
  });
  return String(created.contact.contact_id);
}

export async function createInvoice(args: {
  customerId: string; unitCode: string; date: string; dueDate: string;
  items: { name: string; rate: number; quantity: number }[];
}) {
  const org = await orgId();
  const { data } = await zohoFetch<{ invoice: any }>(`${BASE}/invoices`, {
    method: 'POST',
    query: { organization_id: org },
    body: JSON.stringify({
      customer_id: args.customerId,
      reference_number: args.unitCode,
      date: args.date,
      due_date: args.dueDate,
      line_items: args.items.map((it) => ({ name: it.name, rate: it.rate, quantity: it.quantity })),
    }),
  });
  return data.invoice;
}
