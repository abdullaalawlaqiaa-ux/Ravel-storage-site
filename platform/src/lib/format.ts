const nf = new Intl.NumberFormat('ar-SA-u-nu-latn', { maximumFractionDigits: 0 });

export const money = (n: number) => `${nf.format(Math.round(n))} ر.س`;
export const num = (n: number) => nf.format(n);
export const pct = (n: number) => `${Math.round(n * 100)}%`;

export const SIZE_LABEL: Record<string, string> = { small: 'صغيرة', medium: 'متوسطة', large: 'كبيرة' };

export const DISPLAY_LABEL: Record<string, string> = {
  available: 'متاحة',
  occupied: 'مؤجّرة',
  reserved: 'محجوزة مؤقتاً',
  maintenance: 'صيانة',
  overdue: 'متأخرة السداد',
  expiring: 'عقد ينتهي قريباً',
};

export const INVOICE_STATUS_LABEL: Record<string, string> = {
  draft: 'مسودة', sent: 'مرسلة', unpaid: 'غير مدفوعة', partially_paid: 'مدفوعة جزئياً',
  overdue: 'متأخرة', paid: 'مدفوعة', void: 'ملغاة',
};

export function fmtDate(iso?: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}
