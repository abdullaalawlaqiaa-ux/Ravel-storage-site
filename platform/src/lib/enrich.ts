import type { EnrichedUnit, Invoice, Unit } from './types';
import { settings } from '@/config/mapping';
import { daysBetween, todayISO } from './dates';

const OPEN = new Set(['sent', 'unpaid', 'partially_paid', 'overdue']);

export function isOpen(i: Invoice) {
  return OPEN.has(i.status) && i.balance > 0;
}

export function enrichUnits(units: Unit[], invoices: Invoice[], today = todayISO()): EnrichedUnit[] {
  const byUnit = new Map<string, Invoice[]>();
  for (const inv of invoices) {
    if (!inv.unitCode || !isOpen(inv)) continue;
    const k = inv.unitCode.trim().toUpperCase();
    byUnit.set(k, [...(byUnit.get(k) ?? []), inv]);
  }
  return units.map((u) => {
    const open = byUnit.get(u.code.trim().toUpperCase()) ?? [];
    const balanceDue = open.reduce((a, b) => a + b.balance, 0);
    const overdueDays = open.reduce((m, i) => Math.max(m, daysBetween(i.dueDate, today)), 0);
    const daysToContractEnd = u.contractEnd ? daysBetween(today, u.contractEnd) : null;
    const rented = u.status === 'occupied' || u.status === 'reserved';
    const overdue = balanceDue > 0 && overdueDays > 0;
    const expiring = rented && daysToContractEnd != null && daysToContractEnd <= settings.expiringWindowDays;
    const display =
      u.status === 'maintenance' ? 'maintenance'
      : overdue ? 'overdue'
      : expiring ? 'expiring'
      : u.status;
    return { ...u, balanceDue, overdueDays: Math.max(0, overdueDays), daysToContractEnd, overdue, expiring, display };
  });
}
