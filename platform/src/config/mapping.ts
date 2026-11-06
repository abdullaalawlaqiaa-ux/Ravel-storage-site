/**
 * ربط حقول Zoho Creator بحقول المنصة.
 * --------------------------------------
 * عدّل الأسماء هنا لتطابق "Field Link Name" في تطبيقكم على Creator
 * (تجدونها من صفحة الإعدادات في المنصة ← "اكتشاف الحقول").
 * أو مرّروا JSON كامل في متغير البيئة ZOHO_CREATOR_FIELD_MAP لتجاوز هذه القيم.
 */
export interface CreatorMapping {
  fields: {
    code: string;
    zone: string;
    size: string;
    status: string;
    price: string;
    customerName: string;
    customerPhone: string;
    contractStart: string;
    contractEnd: string;
    widthM: string;
    depthM: string;
    x: string;
    y: string;
    notes: string;
  };
  /** القيم كما هي مكتوبة في Creator لكل حالة. أول قيمة تُستخدم عند الكتابة. */
  statusValues: Record<'available' | 'occupied' | 'reserved' | 'maintenance', string[]>;
  sizeValues: Record<'small' | 'medium' | 'large', string[]>;
}

const DEFAULT_MAPPING: CreatorMapping = {
  fields: {
    code: 'Unit_Number',
    zone: 'Zone',
    size: 'Unit_Size',
    status: 'Status',
    price: 'Monthly_Price',
    customerName: 'Customer_Name',
    customerPhone: 'Phone_Number',
    contractStart: 'Start_Date',
    contractEnd: 'End_Date',
    widthM: 'Width',
    depthM: 'Depth',
    x: 'Position_X',
    y: 'Position_Y',
    notes: 'Notes',
  },
  statusValues: {
    available: ['متاح', 'متاحة', 'فارغ', 'فارغة', 'Available', 'Vacant', 'Empty'],
    occupied: ['مؤجر', 'مؤجرة', 'محجوز', 'محجوزة', 'Occupied', 'Rented', 'Booked'],
    reserved: ['محجوز مؤقتاً', 'محجوز مؤقتا', 'حجز مبدئي', 'Reserved', 'On Hold'],
    maintenance: ['صيانة', 'Maintenance', 'Out of Service'],
  },
  sizeValues: {
    small: ['صغيرة', 'صغير', 'Small', 'S', '2x1.5'],
    medium: ['متوسطة', 'متوسط', 'Medium', 'M', '3x3'],
    large: ['كبيرة', 'كبير', 'Large', 'L', '6x3'],
  },
};

function load(): CreatorMapping {
  const raw = process.env.ZOHO_CREATOR_FIELD_MAP;
  if (!raw) return DEFAULT_MAPPING;
  try {
    const o = JSON.parse(raw);
    return {
      fields: { ...DEFAULT_MAPPING.fields, ...(o.fields ?? {}) },
      statusValues: { ...DEFAULT_MAPPING.statusValues, ...(o.statusValues ?? {}) },
      sizeValues: { ...DEFAULT_MAPPING.sizeValues, ...(o.sizeValues ?? {}) },
    };
  } catch {
    console.error('ZOHO_CREATOR_FIELD_MAP is not valid JSON – using defaults');
    return DEFAULT_MAPPING;
  }
}

export const mapping = load();

/** الأبعاد والأسعار الافتراضية (من موقع رافيل) */
export const SIZE_DEFAULTS = {
  small: { widthM: 2, depthM: 1.5, price: 199 },
  medium: { widthM: 3, depthM: 3, price: 449 },
  large: { widthM: 6, depthM: 3, price: 849 },
} as const;

export const settings = {
  /** عدد الأيام قبل نهاية العقد لاعتباره "ينتهي قريباً" */
  expiringWindowDays: Number(process.env.EXPIRING_WINDOW_DAYS ?? 30),
  /** مدة استحقاق الفاتورة بالأيام */
  invoiceDueDays: Number(process.env.INVOICE_DUE_DAYS ?? 7),
  /** نسبة الضريبة المضافة (تُطبّق في Zoho Books حسب إعداداتكم) */
  currency: 'SAR',
};
