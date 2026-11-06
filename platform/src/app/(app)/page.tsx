import Link from 'next/link';
import { loadAll } from '@/lib/api';
import { computeKpis } from '@/lib/kpis';
import { fmtDate, money, num, pct, SIZE_LABEL } from '@/lib/format';
import { MonthlyChart } from '@/components/MonthlyChart';
import { ErrorNotice } from '@/components/ErrorNotice';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  let data;
  try { data = await loadAll(); } catch (e) { return <ErrorNotice error={e} />; }
  const { mode, units, invoices } = data;
  const k = computeKpis(units, invoices);
  const maxAging = Math.max(1, ...k.aging.map((a) => a.amount));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>لوحة التحكم</h1>
          <p>نظرة شاملة على الوحدات والإيرادات والتحصيل – {fmtDate(new Date().toISOString().slice(0, 10))}</p>
        </div>
        <Link href="/map" className="btn">فتح الخارطة الحيّة</Link>
      </div>
      {mode === 'mock' && (
        <div className="notice warn">
          تعرض المنصة الآن <b>بيانات تجريبية</b>. بعد إضافة مفاتيح Zoho من صفحة <Link href="/settings"><u>الربط والإعدادات</u></Link> تظهر بياناتكم الحقيقية تلقائياً.
        </div>
      )}

      <section className="grid kpis">
        <div className="card kpi">
          <div className="label">نسبة الإشغال</div>
          <div className="value num">{pct(k.occupancy)}</div>
          <div className="sub">{num(k.rented)} مؤجّرة من {num(k.total - k.maintenance)} · بالمساحة {pct(k.occupancyArea)}</div>
        </div>
        <div className="card kpi">
          <div className="label">الدخل الشهري المتكرر</div>
          <div className="value num">{money(k.mrr)}</div>
          <div className="sub">من أصل {money(k.potentialMrr)} عند الإشغال الكامل</div>
        </div>
        <div className="card kpi">
          <div className="label">المستحقات المفتوحة</div>
          <div className="value num">{money(k.receivables)}</div>
          <div className="sub">كل الفواتير غير المسددة</div>
        </div>
        <div className={`card kpi ${k.overdueAmount > 0 ? 'alert' : ''}`}>
          <div className="label">⚠️ المتأخرات</div>
          <div className="value num">{money(k.overdueAmount)}</div>
          <div className="sub">{num(k.overdueCustomers)} عميل متأخر</div>
        </div>
        <div className="card kpi">
          <div className="label">الدخل الضائع يومياً</div>
          <div className="value num">{money(k.lostPerDay)}</div>
          <div className="sub">بسبب {num(k.available)} وحدة فارغة</div>
        </div>
      </section>

      <section className="grid three">
        <div className="card">
          <h2>المفوتر والمحصّل <small>آخر 6 أشهر</small></h2>
          <MonthlyChart months={k.months} />
        </div>
        <div className="card">
          <h2>الإشغال حسب الحجم</h2>
          {k.bySize.map((s) => (
            <div key={s.size}>
              <div className="meter-row">
                <span>{SIZE_LABEL[s.size]}</span>
                <div className="meter" title={`${pct(s.occupancy)}`}><span style={{ width: pct(s.occupancy) }} /></div>
                <span className="r num">{pct(s.occupancy)} · {s.rented}/{s.usable}</span>
              </div>
            </div>
          ))}
          <p className="sub" style={{ color: 'var(--ink-3)', fontSize: '.8rem', marginTop: 10 }}>
            {k.bySize.filter((s) => s.occupancy >= 0.9).map((s) => `💡 الحجم ${SIZE_LABEL[s.size]} شبه ممتلئ – فرصة لرفع السعر`).join(' · ') || 'لا توجد أحجام تقترب من الامتلاء'}
          </p>
        </div>
        <div className="card">
          <h2>أعمار الديون</h2>
          {k.aging.map((a) => (
            <div className="hbar-row" key={a.label} title={`${a.count} فاتورة`}>
              <span style={{ fontSize: '.85rem' }}>{a.label}</span>
              <div className="hbar"><span style={{ width: `${(a.amount / maxAging) * 100}%` }} /></div>
              <span className="num" style={{ fontSize: '.85rem', textAlign: 'left' }}>{money(a.amount)}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>أعلى المتأخرين <small>{k.topOverdue.length} وحدة</small></h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>الوحدة</th><th>العميل</th><th>المبلغ</th><th>التأخير</th></tr></thead>
              <tbody>
                {k.topOverdue.slice(0, 8).map((u) => (
                  <tr key={u.id}>
                    <td><Link href={`/map?unit=${encodeURIComponent(u.code)}`}><b>{u.code}</b></Link></td>
                    <td>{u.customerName ?? '—'}</td>
                    <td className="num">{money(u.balanceDue)}</td>
                    <td className="num"><span className="badge b-overdue">{u.overdueDays} يوم</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!k.topOverdue.length && <div className="empty">لا يوجد متأخرون 🎉</div>}
          </div>
        </div>
        <div className="card">
          <h2>عقود تنتهي قريباً <small>{k.expiringSoon.length} عقد</small></h2>
          <div className="table-wrap">
            <table>
              <thead><tr><th>الوحدة</th><th>العميل</th><th>ينتهي</th><th>المتبقي</th></tr></thead>
              <tbody>
                {k.expiringSoon.slice(0, 8).map((u) => (
                  <tr key={u.id}>
                    <td><Link href={`/map?unit=${encodeURIComponent(u.code)}`}><b>{u.code}</b></Link></td>
                    <td>{u.customerName ?? '—'}</td>
                    <td className="num">{fmtDate(u.contractEnd)}</td>
                    <td className="num">{(u.daysToContractEnd ?? 0) < 0 ? 'منتهٍ' : `${u.daysToContractEnd} يوم`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!k.expiringSoon.length && <div className="empty">لا توجد عقود تنتهي خلال الفترة</div>}
          </div>
        </div>
      </section>
    </>
  );
}
