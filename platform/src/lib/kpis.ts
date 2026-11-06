import type { EnrichedUnit, Invoice, UnitSize } from './types';
import { daysBetween, todayISO } from './dates';
import { isOpen } from './enrich';

export interface Kpis {
  total: number;
  rented: number;
  available: number;
  maintenance: number;
  occupancy: number;
  mrr: number;
  potentialMrr: number;
  lostPerDay: number;
  receivables: number;
  overdueAmount: number;
  overdueCustomers: number;
  bySize: { size: UnitSize; total: number; usable: number; rented: number; available: number; occupancy: number; price: number }[];
  aging: { label: string; amount: number; count: number }[];
  months: { key: string; label: string; billed: number; collected: number }[];
  expiringSoon: EnrichedUnit[];
  topOverdue: EnrichedUnit[];
}

const AR_MONTHS = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

export function computeKpis(units: EnrichedUnit[], invoices: Invoice[], today = todayISO()): Kpis {
  const usable = units.filter((u) => u.status !== 'maintenance');
  const rentedUnits = units.filter((u) => u.status === 'occupied' || u.status === 'reserved');
  const avail = units.filter((u) => u.status === 'available');

  const sizes: UnitSize[] = ['small', 'medium', 'large'];
  const bySize = sizes.map((size) => {
    const all = units.filter((u) => u.size === size);
    const us = all.filter((u) => u.status !== 'maintenance');
    const rented = all.filter((u) => u.status === 'occupied' || u.status === 'reserved').length;
    return {
      size, total: all.length, usable: us.length, rented,
      available: all.filter((u) => u.status === 'available').length,
      occupancy: us.length ? rented / us.length : 0,
      price: all.length ? Math.round(all.reduce((a, b) => a + b.monthlyPrice, 0) / all.length) : 0,
    };
  }).filter((s) => s.total > 0);

  const open = invoices.filter(isOpen);
  const buckets = [
    { label: 'غير مستحقة بعد', min: -Infinity, max: 0 },
    { label: '1–30 يوم', min: 1, max: 30 },
    { label: '31–60 يوم', min: 31, max: 60 },
    { label: '61–90 يوم', min: 61, max: 90 },
    { label: '+90 يوم', min: 91, max: Infinity },
  ];
  const aging = buckets.map((b) => {
    const inB = open.filter((i) => {
      const d = daysBetween(i.dueDate, today);
      return d >= b.min && d <= b.max;
    });
    return { label: b.label, amount: inB.reduce((a, x) => a + x.balance, 0), count: inB.length };
  });
  const overdueInv = open.filter((i) => daysBetween(i.dueDate, today) > 0);

  const months: Kpis['months'] = [];
  const [ty, tm] = today.split('-').map(Number);
  for (let k = 5; k >= 0; k--) {
    const d = new Date(Date.UTC(ty, tm - 1 - k, 1));
    const key = d.toISOString().slice(0, 7);
    const inM = invoices.filter((i) => i.status !== 'void' && i.date.startsWith(key));
    const billed = inM.reduce((a, b) => a + b.total, 0);
    months.push({ key, label: AR_MONTHS[d.getUTCMonth()], billed, collected: billed - inM.reduce((a, b) => a + b.balance, 0) });
  }

  return {
    total: units.length,
    rented: rentedUnits.length,
    available: avail.length,
    maintenance: units.length - usable.length,
    occupancy: usable.length ? rentedUnits.length / usable.length : 0,
    mrr: rentedUnits.reduce((a, b) => a + b.monthlyPrice, 0),
    potentialMrr: usable.reduce((a, b) => a + b.monthlyPrice, 0),
    lostPerDay: avail.reduce((a, b) => a + b.monthlyPrice, 0) / 30,
    receivables: open.reduce((a, b) => a + b.balance, 0),
    overdueAmount: overdueInv.reduce((a, b) => a + b.balance, 0),
    overdueCustomers: new Set(overdueInv.map((i) => i.customerName)).size,
    bySize,
    aging,
    months,
    expiringSoon: units.filter((u) => u.expiring).sort((a, b) => (a.daysToContractEnd ?? 0) - (b.daysToContractEnd ?? 0)),
    topOverdue: units.filter((u) => u.overdue).sort((a, b) => b.balanceDue - a.balanceDue),
  };
}
