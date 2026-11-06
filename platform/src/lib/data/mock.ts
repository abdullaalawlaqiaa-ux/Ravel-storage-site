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

const FIRST = ['محمد', 'عبدالله', 'حمدان', 'سارة', 'مريم', 'خالد', 'ريم', 'سلطان', 'هند', 'عمر', 'لطيفة', 'سعيد', 'شما', 'راشد', 'فاطمة', 'منصور', 'Fares', 'John'];
const LAST = ['المنصوري', 'الكعبي', 'الظاهري', 'النعيمي', 'المزروعي', 'الشامسي', 'الهاملي', 'السويدي', 'العامري', 'البلوشي', 'الرميثي', 'المهيري'];
const COMPANIES = ['مطعم السنبلة', 'كافيه الركن', 'معرض الأفق للأثاث', 'شركة سهل للنقل', 'ورشة الإتقان للصيانة', 'محل أزياء الورد'];

function seed(): { units: Unit[]; invoices: Invoice[] } {
  const r = rng(20261106);
  const pick = <T,>(a: T[]) => a[Math.floor(r() * a.length)];
  const today = todayISO();
  // ⚠️ بيانات تجريبية للعرض فقط – الأسعار هنا ليست أسعار رافل المعتمدة
  const DEMO_PRICE: Record<UnitSize, number> = { small: 350, medium: 900, large: 1800, space: 0 };
  const zones: { zone: string; floor: string; size: UnitSize; count: number; dims?: [number, number][] }[] = [
    { zone: 'A', floor: 'أرضي', size: 'small', count: 24 },
    { zone: 'B', floor: 'أرضي', size: 'medium', count: 16 },
    { zone: 'S', floor: 'أرضي', size: 'space', count: 3, dims: [[11, 10], [5, 4], [4, 3]] },
    { zone: 'C', floor: 'ميزانين', size: 'small', count: 20 },
    { zone: 'D', floor: 'ميزانين', size: 'large', count: 8 },
  ];
  const units: Unit[] = [];
  const invoices: Invoice[] = [];
  let invNo = 1000;

  for (const z of zones) {
    for (let i = 1; i <= z.count; i++) {
      const base = SIZE_DEFAULTS[z.size];
      const [widthM, depthM] = z.dims?.[i - 1] ?? [base.widthM, base.depthM];
      const price = z.size === 'space' ? Math.round(widthM * depthM * 45) : DEMO_PRICE[z.size];
      const d = { widthM, depthM, price };
      const roll = r();
      const status: UnitStatus =
        roll < 0.72 ? 'occupied' : roll < 0.77 ? 'reserved' : roll < 0.8 ? 'maintenance' : 'available';
      const code = `${z.zone}-${String(i).padStart(2, '0')}`;
      const u: Unit = {
        id: `mock-${code}`, code, zone: z.zone, branch: 'الفرع الرئيسي', floor: z.floor, size: z.size,
        widthM: d.widthM, depthM: d.depthM, status, monthlyPrice: d.price,
      };
      if (status === 'occupied' || status === 'reserved') {
        const isCompany = z.size === 'space' ? true : z.size === 'large' ? r() < 0.6 : r() < 0.12;
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
