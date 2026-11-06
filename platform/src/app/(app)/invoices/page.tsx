import Link from 'next/link';
import { getDataSource } from '@/lib/data';
import { daysBetween, todayISO } from '@/lib/dates';
import { INVOICE_STATUS_LABEL, fmtDate, money } from '@/lib/format';
import { ErrorNotice } from '@/components/ErrorNotice';
import { isOpen } from '@/lib/enrich';

export const dynamic = 'force-dynamic';

const FILTERS = [
  { id: 'open', label: 'غير مسددة' },
  { id: 'overdue', label: 'متأخرة' },
  { id: 'paid', label: 'مدفوعة' },
  { id: 'all', label: 'الكل' },
];

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f = 'open', q = '' } = await searchParams;
  let invoices;
  try { invoices = await getDataSource().listInvoices(); } catch (e) { return <ErrorNotice error={e} />; }
  const today = todayISO();
  const needle = q.trim().toLowerCase();
  const list = invoices
    .filter((i) =>
      f === 'all' ? true
      : f === 'paid' ? i.status === 'paid'
      : f === 'overdue' ? isOpen(i) && i.dueDate < today
      : isOpen(i))
    .filter((i) => !needle || i.number.toLowerCase().includes(needle) || i.customerName.toLowerCase().includes(needle) || (i.unitCode ?? '').toLowerCase().includes(needle));
  const sum = list.reduce((a, b) => a + b.balance, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>الفواتير</h1>
          <p>من Zoho Books · {list.length} فاتورة · الرصيد المفتوح {money(sum)}</p>
        </div>
      </div>
      <div className="card">
        <form className="map-toolbar" action="/invoices">
          <input type="hidden" name="f" value={f} />
          <input className="input" name="q" defaultValue={q} placeholder="ابحث برقم الفاتورة أو العميل أو الوحدة" />
          <button className="btn ghost sm">بحث</button>
          <div className="chips">
            {FILTERS.map((x) => (
              <Link key={x.id} className={`chip ${f === x.id ? '' : 'off'}`} href={`/invoices?f=${x.id}${q ? `&q=${encodeURIComponent(q)}` : ''}`}>{x.label}</Link>
            ))}
          </div>
        </form>
        <div className="table-wrap">
          <table>
            <thead>
              <tr><th>الرقم</th><th>العميل</th><th>الوحدة</th><th>التاريخ</th><th>الاستحقاق</th><th>الإجمالي</th><th>المتبقي</th><th>الحالة</th></tr>
            </thead>
            <tbody>
              {list.slice(0, 300).map((i) => {
                const late = isOpen(i) && i.dueDate < today;
                return (
                  <tr key={i.id}>
                    <td className="num">{i.url ? <a href={i.url} target="_blank" rel="noreferrer"><u>{i.number}</u></a> : i.number}</td>
                    <td>{i.customerName}</td>
                    <td>{i.unitCode ? <Link href={`/map?unit=${encodeURIComponent(i.unitCode)}`}><b>{i.unitCode}</b></Link> : '—'}</td>
                    <td className="num">{fmtDate(i.date)}</td>
                    <td className="num">{fmtDate(i.dueDate)}{late && <small style={{ color: 'var(--danger)' }}> · {daysBetween(i.dueDate, today)} يوم</small>}</td>
                    <td className="num">{money(i.total)}</td>
                    <td className="num">{money(i.balance)}</td>
                    <td><span className={`badge ${i.status === 'paid' ? 'b-paid' : late ? 'b-overdue' : 'b-open'}`}>{late ? 'متأخرة' : INVOICE_STATUS_LABEL[i.status]}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!list.length && <div className="empty">لا توجد فواتير</div>}
        </div>
      </div>
    </>
  );
}
