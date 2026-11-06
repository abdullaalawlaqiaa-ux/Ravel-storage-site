import type { DataSource, Invoice, NewInvoiceInput, Unit, UnitSize, UnitStatus } from '../types';
import { SIZE_DEFAULTS } from '@/config/mapping';
import { addDays, addMonths, todayISO } from '../dates';

/** بيانات تجريبية ثابتة (نفس النتيجة في كل تشغيل) لعرض المنصة قبل الربط */
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const FIRST = ['محمد', 'عبدالله', 'فهد', 'سارة', 'نورة', 'خالد', 'ريم', 'سلطان', 'هند', 'عمر', 'لطيفة', 'تركي', 'مها', 'ناصر', 'جود', 'بدر', 'العنود', 'يوسف'];
const LAST = ['العتيبي', 'القحطاني', 'الدوسري', 'الشهري', 'الغامدي', 'الحربي', 'الزهراني', 'المطيري', 'السبيعي', 'العنزي', 'الشمري', 'الأحمدي'];
const COMPANIES = ['مؤسسة الريادة للتجارة', 'شركة نماء للتجزئة', 'متجر بيت الأناقة', 'مؤسسة الأفق للأثاث', 'شركة سهل اللوجستية', 'متجر عطور الورد'];

function seed(): { units: Unit[]; invoices: Invoice[] } {
  const r = rng(20261106);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const today = todayISO();
  const zones: { zone: string; size: UnitSize; count: number }[] = [
    { zone: 'A', size: 'small', count: 28 },
    { zone: 'B', size: 'medium', count: 20 },
    { zone: 'C', size: 'large', count: 10 },
  ];
  const units: Unit[] = [];
  const invoices: Invoice[] = [];
  let invNo = 1000;

  for (const z of zones) {
    for (let i = 1; i <= z.count; i++) {
      const d = SIZE_DEFAULTS[z.size];
      const roll = r();
      const status: UnitStatus =
        roll < 0.72 ? 'occupied' : roll < 0.77 ? 'reserved' : roll < 0.8 ? 'maintenance' : 'available';
      const code = `${z.zone}-${String(i).padStart(2, '0')}`;
      const u: Unit = {
        id: `mock-${code}`, code, zone: z.zone, size: z.size,
        widthM: d.widthM, depthM: d.depthM, status, monthlyPrice: d.price,
      };
      if (status === 'occupied' || status === 'reserved') {
        const isCompany = z.size === 'large' ? r() < 0.6 : r() < 0.12;
        u.customerName = isCompany ? pick(COMPANIES) : `${pick(FIRST)} ${pick(LAST)}`;
        u.customerPhone = `05${Math.floor(10000000 + r() * 89999999)}`;
        const monthsAgo = status === 'reserved' ? 0 : 1 + Math.floor(r() * 16);
        u.contractStart = addDays(addMonths(today, -monthsAgo), status === 'reserved' ? 0 : -Math.floor(r() * 27));
        const term = pick([3, 6, 12, 12]);
        let end = addMonths(u.contractStart, term);
        while (end < today) end = addMonths(end, term);
        u.contractEnd = end;
        if (status === 'reserved') u.notes = 'حجز مبدئي – بانتظار الدفع';

        if (status === 'occupied') {
          const lateMonths = r() < 0.2 ? 1 + Math.floor(r() * 4) : 0;
          const first = monthsAgo > 6 ? addMonths(today, -6) : u.contractStart;
          for (let m = 0; ; m++) {
            const date = addMonths(first, m);
            if (date > today) break;
            const due = addDays(date, 7);
            const remaining = Math.round((Date.parse(today) - Date.parse(date)) / (30 * 86400000));
            const unpaid = remaining < lateMonths;
            const balance = unpaid ? d.price : 0;
            invoices.push({
              id: `inv-${invNo}`, number: `INV-${invNo++}`, customerName: u.customerName,
              unitCode: code, date, dueDate: due, total: d.price, balance,
              status: balance === 0 ? 'paid' : due < today ? 'overdue' : 'sent',
            });
          }
        }
      }
      if (status === 'maintenance') u.notes = 'إصلاح الباب الأمامي';
      units.push(u);
    }
  }
  return { units, invoices };
}

const g = globalThis as unknown as { __mockStore?: { units: Unit[]; invoices: Invoice[]; next: number } };

function store() {
  if (!g.__mockStore) g.__mockStore = { ...seed(), next: 5000 };
  return g.__mockStore;
}

export const mockSource: DataSource = {
  mode: 'mock',
  async listUnits() {
    return structuredClone(store().units);
  },
  async listInvoices() {
    return structuredClone(store().invoices);
  },
  async updateUnit(id, patch) {
    const s = store();
    const u = s.units.find((x) => x.id === id);
    if (!u) throw new Error('الوحدة غير موجودة');
    Object.assign(u, patch);
    for (const k of Object.keys(patch) as (keyof Unit)[]) if (patch[k] === undefined) delete u[k];
  },
  async createInvoice(input: NewInvoiceInput) {
    const s = store();
    const total = input.items.reduce((a, b) => a + b.rate * b.quantity, 0);
    const inv: Invoice = {
      id: `inv-${s.next}`, number: `INV-${s.next++}`, customerName: input.customerName,
      unitCode: input.unitCode, date: input.date, dueDate: input.dueDate, total, balance: total, status: 'sent',
    };
    s.invoices.unshift(inv);
    return structuredClone(inv);
  },
};
