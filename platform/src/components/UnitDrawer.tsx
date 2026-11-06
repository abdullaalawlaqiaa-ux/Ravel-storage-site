'use client';
import { useEffect, useRef, useState } from 'react';
import type { EnrichedUnit } from '@/lib/types';
import type { UnitAction } from '@/lib/actions';
import { DISPLAY_LABEL, SIZE_LABEL, fmtDate, money } from '@/lib/format';

type Tab = 'book' | 'extend' | 'invoice' | 'vacate' | 'maintenance' | 'price';

function waLink(u: EnrichedUnit) {
  if (!u.customerPhone) return null;
  const phone = u.customerPhone.replace(/\D/g, '').replace(/^0/, '971');
  const text = u.overdue
    ? `مرحباً ${u.customerName}، نذكّركم بوجود مبلغ مستحق ${Math.round(u.balanceDue)} درهم على وحدة التخزين ${u.code} لدى رافل للتخزين. شاكرين تعاونكم.`
    : `مرحباً ${u.customerName}، عقد وحدة التخزين ${u.code} لدى رافل للتخزين ينتهي بتاريخ ${fmtDate(u.contractEnd)}. هل ترغب بالتمديد؟`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

export function UnitDrawer({ unit: u, onClose, onDone }: { unit: EnrichedUnit; onClose: () => void; onDone: () => Promise<void> | void }) {
  const rented = u.status === 'occupied' || u.status === 'reserved';
  const tabs: { id: Tab; label: string }[] =
    u.status === 'available' ? [{ id: 'book', label: 'حجز' }, { id: 'maintenance', label: 'صيانة' }, { id: 'price', label: 'السعر' }]
    : u.status === 'maintenance' ? [{ id: 'maintenance', label: 'الصيانة' }, { id: 'price', label: 'السعر' }]
    : [{ id: 'extend', label: 'تمديد' }, { id: 'invoice', label: 'فاتورة' }, { id: 'vacate', label: 'إخلاء' }, { id: 'price', label: 'السعر' }];
  const [tab, setTab] = useState<Tab>(tabs[0].id);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.innerWidth <= 1100) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [start, setStart] = useState(new Date().toISOString().slice(0, 10));
  const [months, setMonths] = useState(u.status === 'available' ? 3 : 1);
  const [withInvoice, setWithInvoice] = useState(true);
  const [reserveOnly, setReserveOnly] = useState(false);
  const [note, setNote] = useState('');
  const [price, setPrice] = useState(u.monthlyPrice);

  async function run(action: UnitAction, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/units/${encodeURIComponent(u.id)}/action`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setToast({ msg: j.message });
      await onDone();
    } catch (e) {
      setToast({ msg: (e as Error).message, err: true });
    } finally {
      setBusy(false);
      setTimeout(() => setToast(null), 4000);
    }
  }

  const wa = rented ? waLink(u) : null;
  const total = months * u.monthlyPrice;

  return (
    <div className="card" ref={ref}>
      <h3>
        <span>وحدة {u.code}</span>
        <button className="btn ghost sm" onClick={onClose} aria-label="إغلاق">✕</button>
      </h3>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="badge" style={{ color: `var(--st-${u.display})` }}>{DISPLAY_LABEL[u.display]}</span>
        <span className="badge b-open">{SIZE_LABEL[u.size]} · {u.widthM}×{u.depthM} م</span>
      </div>

      <dl className="kv">
        <dt>الفرع</dt><dd>{u.branch}</dd>
        <dt>الطابق / المنطقة</dt><dd>{u.floor} · {u.zone}</dd>
        {u.size === 'space' && <><dt>المساحة</dt><dd className="num">{Math.round(u.widthM * u.depthM)} م²</dd></>}
        <dt>السعر الشهري</dt><dd className="num">{u.monthlyPrice > 0 ? money(u.monthlyPrice) : <span style={{ color: 'var(--danger)' }}>غير محدد</span>}</dd>
        {rented && <>
          <dt>العميل</dt><dd>{u.customerName ?? '—'}</dd>
          <dt>الجوال</dt><dd className="num" dir="ltr" style={{ textAlign: 'right' }}>{u.customerPhone ?? '—'}</dd>
          <dt>بداية العقد</dt><dd className="num">{fmtDate(u.contractStart)}</dd>
          <dt>نهاية العقد</dt><dd className="num">{fmtDate(u.contractEnd)}{u.daysToContractEnd != null && ` (${u.daysToContractEnd < 0 ? 'منتهٍ' : `بعد ${u.daysToContractEnd} يوم`})`}</dd>
          <dt>الرصيد المستحق</dt>
          <dd className="num" style={{ color: u.balanceDue > 0 ? 'var(--danger)' : undefined, fontWeight: 700 }}>
            {money(u.balanceDue)}{u.overdueDays > 0 && ` · متأخر ${u.overdueDays} يوم`}
          </dd>
        </>}
        {u.notes && <><dt>ملاحظات</dt><dd>{u.notes}</dd></>}
      </dl>

      {wa && (
        <a className="btn ghost sm" href={wa} target="_blank" rel="noreferrer" style={{ marginBottom: 4 }}>
          💬 {u.overdue ? 'تذكير بالسداد عبر واتساب' : 'تواصل عبر واتساب'}
        </a>
      )}

      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={`tab ${tab === t.id ? 'on' : ''}`} onClick={() => setTab(t.id)}>{t.label}</button>
        ))}
      </div>

      {tab === 'book' && (
        <form onSubmit={(e) => { e.preventDefault(); run({ type: 'book', customerName: name, customerPhone: phone, startDate: start, months, invoice: withInvoice, reserveOnly }); }}>
          <div className="field"><label>اسم العميل *</label><input className="input" required value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="field"><label>الجوال</label><input className="input" dir="ltr" placeholder="05xxxxxxxx" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div className="row">
            <div className="field"><label>تاريخ البداية</label><input className="input" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></div>
            <div className="field"><label>المدة (شهر)</label><input className="input" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></div>
          </div>
          <label className="check"><input type="checkbox" checked={reserveOnly} onChange={(e) => setReserveOnly(e.target.checked)} /> حجز مبدئي فقط (بانتظار الدفع)</label>
          <label className="check"><input type="checkbox" checked={withInvoice} onChange={(e) => setWithInvoice(e.target.checked)} /> إصدار فاتورة في Zoho Books ({money(total)})</label>
          <button className="btn" disabled={busy} style={{ width: '100%' }}>{busy ? 'جارٍ التنفيذ…' : 'تأكيد الحجز'}</button>
        </form>
      )}

      {tab === 'extend' && (
        <form onSubmit={(e) => { e.preventDefault(); run({ type: 'extend', months, invoice: withInvoice }); }}>
          <div className="field"><label>مدة التمديد (شهر)</label><input className="input" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></div>
          <label className="check"><input type="checkbox" checked={withInvoice} onChange={(e) => setWithInvoice(e.target.checked)} /> إصدار فاتورة التمديد ({money(total)})</label>
          <button className="btn" disabled={busy} style={{ width: '100%' }}>{busy ? 'جارٍ التنفيذ…' : 'تمديد العقد'}</button>
        </form>
      )}

      {tab === 'invoice' && (
        <form onSubmit={(e) => { e.preventDefault(); run({ type: 'invoice', months }); }}>
          <div className="field"><label>عدد الأشهر</label><input className="input" type="number" min={1} max={36} value={months} onChange={(e) => setMonths(Number(e.target.value))} /></div>
          <p style={{ color: 'var(--ink-3)', fontSize: '.85rem', marginBottom: 10 }}>فاتورة باسم {u.customerName} بقيمة {money(total)} (قبل الضريبة حسب إعدادات Books).</p>
          <button className="btn" disabled={busy} style={{ width: '100%' }}>{busy ? 'جارٍ الإصدار…' : 'إصدار الفاتورة'}</button>
        </form>
      )}

      {tab === 'vacate' && (
        <div>
          {u.balanceDue > 0 && <div className="notice err">على العميل رصيد مستحق {money(u.balanceDue)} – يُفضّل التحصيل قبل الإخلاء.</div>}
          <p style={{ color: 'var(--ink-3)', fontSize: '.9rem', marginBottom: 10 }}>سيتم فصل العميل عن الوحدة وتحويلها إلى «متاحة». الفواتير تبقى كما هي في Books.</p>
          <button className="btn danger" disabled={busy} style={{ width: '100%' }} onClick={() => run({ type: 'vacate' }, `تأكيد إخلاء الوحدة ${u.code}؟`)}>إخلاء الوحدة</button>
        </div>
      )}

      {tab === 'maintenance' && (
        u.status === 'maintenance' ? (
          <button className="btn" disabled={busy} style={{ width: '100%' }} onClick={() => run({ type: 'maintenance', on: false })}>إنهاء الصيانة وإتاحة الوحدة</button>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); run({ type: 'maintenance', on: true, note }); }}>
            <div className="field"><label>سبب الصيانة</label><input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثال: إصلاح القفل" /></div>
            <button className="btn ghost" disabled={busy} style={{ width: '100%' }}>تحويل للصيانة</button>
          </form>
        )
      )}

      {tab === 'price' && (
        <form onSubmit={(e) => { e.preventDefault(); run({ type: 'price', monthlyPrice: price }); }}>
          <div className="field"><label>السعر الشهري (درهم)</label><input className="input" type="number" min={1} value={price} onChange={(e) => setPrice(Number(e.target.value))} /></div>
          <button className="btn ghost" disabled={busy} style={{ width: '100%' }}>حفظ السعر</button>
        </form>
      )}

      {toast && <div className={`toast ${toast.err ? 'err' : ''}`} role="status">{toast.msg}</div>}
    </div>
  );
}
