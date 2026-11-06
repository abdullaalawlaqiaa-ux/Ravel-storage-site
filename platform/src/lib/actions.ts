import type { DataSource, Unit } from './types';
import { settings, SIZE_DEFAULTS } from '@/config/mapping';
import { addDays, addMonths, todayISO } from './dates';
import { SIZE_LABEL } from './format';

export type UnitAction =
  | { type: 'book'; customerName: string; customerPhone?: string; startDate?: string; months: number; invoice: boolean; reserveOnly?: boolean }
  | { type: 'extend'; months: number; invoice: boolean }
  | { type: 'vacate' }
  | { type: 'maintenance'; on: boolean; note?: string }
  | { type: 'invoice'; months: number }
  | { type: 'price'; monthlyPrice: number };

function lineName(u: Unit, months: number, from: string) {
  return `إيجار وحدة ${SIZE_LABEL[u.size] ?? ''} ${u.code} – ${months} شهر (من ${from})`;
}

export async function runUnitAction(ds: DataSource, unitId: string, a: UnitAction) {
  const units = await ds.listUnits();
  const u = units.find((x) => x.id === unitId);
  if (!u) throw new Error('الوحدة غير موجودة');
  const today = todayISO();
  const months = 'months' in a ? Math.max(1, Math.min(36, Math.floor(Number(a.months) || 1))) : 0;
  const price = u.monthlyPrice || SIZE_DEFAULTS[u.size].price;

  const invoice = async (customerName: string, customerPhone: string | undefined, from: string) =>
    ds.createInvoice({
      customerName, customerPhone, unitCode: u.code, date: today,
      dueDate: addDays(today, settings.invoiceDueDays),
      items: [{ name: lineName(u, months, from), rate: price, quantity: months }],
    });

  switch (a.type) {
    case 'book': {
      if (u.status !== 'available') throw new Error('الوحدة غير متاحة للحجز');
      const name = a.customerName?.trim();
      if (!name) throw new Error('اسم العميل مطلوب');
      const start = a.startDate || today;
      await ds.updateUnit(u.id, {
        status: a.reserveOnly ? 'reserved' : 'occupied',
        customerName: name, customerPhone: a.customerPhone?.trim() || undefined,
        contractStart: start, contractEnd: addMonths(start, months),
      });
      const inv = a.invoice ? await invoice(name, a.customerPhone, start) : null;
      return { message: `تم حجز ${u.code} لـ ${name}${inv ? ` وإصدار الفاتورة ${inv.number}` : ''}`, invoice: inv };
    }
    case 'extend': {
      if (!u.customerName) throw new Error('لا يوجد عميل على هذه الوحدة');
      const base = u.contractEnd && u.contractEnd > today ? u.contractEnd : today;
      const end = addMonths(base, months);
      await ds.updateUnit(u.id, { contractEnd: end, status: 'occupied' });
      const inv = a.invoice ? await invoice(u.customerName, u.customerPhone, base) : null;
      return { message: `تم تمديد ${u.code} حتى ${end}${inv ? ` وإصدار ${inv.number}` : ''}`, invoice: inv };
    }
    case 'vacate': {
      await ds.updateUnit(u.id, {
        status: 'available', customerName: undefined, customerPhone: undefined,
        contractStart: undefined, contractEnd: undefined, notes: undefined,
      });
      return { message: `تم إخلاء ${u.code} وأصبحت متاحة` };
    }
    case 'maintenance': {
      if (a.on && u.customerName) throw new Error('أخلِ الوحدة أولاً قبل تحويلها للصيانة');
      await ds.updateUnit(u.id, { status: a.on ? 'maintenance' : 'available', notes: a.on ? a.note || 'صيانة' : undefined });
      return { message: a.on ? `${u.code} تحت الصيانة` : `${u.code} عادت متاحة` };
    }
    case 'invoice': {
      if (!u.customerName) throw new Error('لا يوجد عميل على هذه الوحدة');
      const inv = await invoice(u.customerName, u.customerPhone, today);
      return { message: `تم إصدار الفاتورة ${inv.number}`, invoice: inv };
    }
    case 'price': {
      const p = Number(a.monthlyPrice);
      if (!(p > 0)) throw new Error('سعر غير صالح');
      await ds.updateUnit(u.id, { monthlyPrice: p });
      return { message: `تم تحديث سعر ${u.code} إلى ${p} ر.س` };
    }
    default:
      throw new Error('إجراء غير معروف');
  }
}
