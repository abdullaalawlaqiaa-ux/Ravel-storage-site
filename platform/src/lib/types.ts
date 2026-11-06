export type UnitSize = 'small' | 'medium' | 'large' | 'space';
export type UnitStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface Unit {
  id: string;
  code: string;
  zone: string;
  /** الفرع */
  branch: string;
  /** الطابق: أرضي / ميزانين */
  floor: string;
  size: UnitSize;
  /** أبعاد الوحدة بالمتر (للرسم على الخارطة) */
  widthM: number;
  depthM: number;
  /** موقع الوحدة على الخارطة بالمتر – اختياري، إذا غاب نرتّبها تلقائياً */
  x?: number;
  y?: number;
  status: UnitStatus;
  monthlyPrice: number;
  customerName?: string;
  customerPhone?: string;
  /** YYYY-MM-DD */
  contractStart?: string;
  contractEnd?: string;
  notes?: string;
}

export type InvoiceStatus =
  | 'draft' | 'sent' | 'unpaid' | 'partially_paid' | 'overdue' | 'paid' | 'void';

export interface Invoice {
  id: string;
  number: string;
  customerName: string;
  unitCode?: string;
  /** YYYY-MM-DD */
  date: string;
  dueDate: string;
  total: number;
  balance: number;
  status: InvoiceStatus;
  url?: string;
}

export interface EnrichedUnit extends Unit {
  balanceDue: number;
  overdueDays: number;
  daysToContractEnd: number | null;
  overdue: boolean;
  expiring: boolean;
  /** الحالة المعروضة على الخارطة */
  display: DisplayState;
}

export type DisplayState =
  | 'available' | 'occupied' | 'reserved' | 'maintenance' | 'overdue' | 'expiring';

export interface NewInvoiceInput {
  customerName: string;
  customerPhone?: string;
  unitCode: string;
  date: string;
  dueDate: string;
  items: { name: string; rate: number; quantity: number }[];
}

export interface DataSource {
  mode: 'mock' | 'zoho';
  listUnits(): Promise<Unit[]>;
  listInvoices(): Promise<Invoice[]>;
  updateUnit(id: string, patch: Partial<Unit>): Promise<void>;
  createInvoice(input: NewInvoiceInput): Promise<Invoice>;
}
