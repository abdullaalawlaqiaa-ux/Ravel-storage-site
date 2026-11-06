'use client';
import { Fragment, useEffect, useState } from 'react';

type Status = {
  mode: 'mock' | 'zoho'; configured: boolean; dc?: string; dcLabel?: string; apiDomain?: string;
  auth?: string; books?: string; creator?: { owner: string; app: string; report: string } | 'missing';
  organizations?: { id: string; name: string; currency: string }[];
};

const ok = (v?: string) => v === 'ok';

export function SettingsClient({ scopes, fields }: { scopes: string[]; fields: Record<string, string> }) {
  const [st, setSt] = useState<Status | null>(null);
  const [clientId, setClientId] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [ex, setEx] = useState<{ refreshToken?: string; dc?: string; error?: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [disc, setDisc] = useState<any>(null);
  const [discErr, setDiscErr] = useState('');
  const [sel, setSel] = useState<{ owner?: string; app?: string; form?: string }>({});

  useEffect(() => { fetch('/api/zoho/status').then((r) => r.json()).then(setSt).catch(() => {}); }, []);

  async function exchange(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setEx(null);
    const r = await fetch('/api/zoho/exchange', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId, clientSecret: secret, code }) });
    const j = await r.json();
    setEx(r.ok ? j : { error: j.error });
    setBusy(false);
  }

  async function discover(next: { owner?: string; app?: string; form?: string }) {
    setSel(next); setDiscErr('');
    const qs = new URLSearchParams(Object.entries(next).filter(([, v]) => v) as [string, string][]).toString();
    const r = await fetch(`/api/zoho/discover${qs ? `?${qs}` : ''}`);
    const j = await r.json();
    if (!r.ok) { setDiscErr(j.error); return; }
    setDisc((d: any) => ({ ...d, ...j }));
  }

  const envBlock = ex?.refreshToken
    ? `ZOHO_CLIENT_ID=${clientId}\nZOHO_CLIENT_SECRET=<ضع السر هنا>\nZOHO_REFRESH_TOKEN=${ex.refreshToken}\nZOHO_DC=${ex.dc}`
    : '';

  return (
    <>
      <div className="page-head"><div><h1>الربط والإعدادات</h1><p>ربط المنصة بـ Zoho Creator و Zoho Books</p></div></div>

      <section className="grid two">
        <div className="card">
          <h2>حالة الاتصال</h2>
          {!st ? <p>جارٍ الفحص…</p> : !st.configured ? (
            <div className="notice warn">المنصة تعمل الآن ببيانات <b>تجريبية</b>. أكمل الخطوات بالأسفل لتفعيل الربط.</div>
          ) : (
            <dl className="kv">
              <dt>المصادقة</dt><dd>{ok(st.auth) ? '✅ ناجحة' : `❌ ${st.auth}`}</dd>
              <dt>منطقة الحساب</dt><dd>{st.dcLabel ?? '—'} <small style={{ color: 'var(--ink-3)' }}>(اكتُشفت تلقائياً)</small></dd>
              <dt>Zoho Books</dt><dd>{ok(st.books) ? `✅ ${st.organizations?.map((o) => o.name).join('، ')}` : st.books ? `❌ ${st.books}` : '—'}</dd>
              <dt>Zoho Creator</dt><dd>{st.creator === 'missing' ? '⚠️ حدّد التطبيق والتقرير (بالأسفل)' : st.creator ? `✅ ${st.creator.app} / ${st.creator.report}` : '—'}</dd>
              <dt>مصدر البيانات</dt><dd>{st.mode === 'zoho' ? 'Zoho (مباشر)' : 'تجريبي'}</dd>
            </dl>
          )}
        </div>

        <div className="card">
          <h2>الخطوة 1: إنشاء Self Client في Zoho</h2>
          <ol className="steps">
            <li>افتح <a href="https://api-console.zoho.com" target="_blank" rel="noreferrer"><u>api-console.zoho.com</u></a> وسجّل دخولك بحساب زوهو الخاص بالشركة (يحوّلك تلقائياً لمنطقتكم).</li>
            <li>اختر <b>Add Client</b> ← <b>Self Client</b> ← Create. انسخ <b>Client ID</b> و <b>Client Secret</b>.</li>
            <li>في تبويب <b>Generate Code</b> الصق الصلاحيات التالية، واختر المدة <b>10 دقائق</b>، ثم Create وانسخ الكود:
              <div className="mono" style={{ display: 'block', marginTop: 6, padding: 8, wordBreak: 'break-all', userSelect: 'all' }}>{scopes.join(',')}</div>
            </li>
            <li>الصق الثلاثة في النموذج المجاور خلال 10 دقائق.</li>
          </ol>
        </div>
      </section>

      <section className="grid two">
        <div className="card">
          <h2>الخطوة 2: توليد Refresh Token</h2>
          <form onSubmit={exchange}>
            <div className="field"><label>Client ID</label><input className="input" dir="ltr" value={clientId} onChange={(e) => setClientId(e.target.value)} required /></div>
            <div className="field"><label>Client Secret</label><input className="input" dir="ltr" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} required /></div>
            <div className="field"><label>Grant Code</label><input className="input" dir="ltr" value={code} onChange={(e) => setCode(e.target.value)} required /></div>
            <button className="btn" disabled={busy}>{busy ? 'جارٍ التحقق في كل المناطق…' : 'توليد المفتاح واكتشاف المنطقة'}</button>
          </form>
          {ex?.error && <div className="notice err" style={{ marginTop: 12 }}>{ex.error}</div>}
          {ex?.refreshToken && (
            <div style={{ marginTop: 12 }}>
              <div className="notice">✅ تم! منطقة حسابكم: <b>{ex.dc}</b>. انسخ القيم التالية إلى متغيرات البيئة في الاستضافة (Vercel ← Settings ← Environment Variables) ثم أعد النشر:</div>
              <pre className="mono" style={{ display: 'block', padding: 10, whiteSpace: 'pre-wrap', wordBreak: 'break-all', userSelect: 'all' }}>{envBlock}</pre>
              <p style={{ color: 'var(--ink-3)', fontSize: '.82rem' }}>لا ترسل هذه القيم لأي شخص. المفتاح لا يُحفظ في المنصة – يظهر هنا مرة واحدة فقط.</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2>الخطوة 3: اكتشاف تطبيق Creator والحقول</h2>
          {!st?.configured || !ok(st?.auth) ? (
            <p style={{ color: 'var(--ink-3)' }}>تتفعّل بعد إضافة المفاتيح ونجاح المصادقة.</p>
          ) : (
            <>
              <button className="btn ghost sm" onClick={() => discover({})}>عرض تطبيقاتي في Creator</button>
              {discErr && <div className="notice err" style={{ marginTop: 10 }}>{discErr}</div>}
              {disc?.applications && (
                <div className="chips" style={{ marginTop: 10 }}>
                  {disc.applications.map((a: any) => (
                    <button key={a.linkName} className={`chip ${sel.app === a.linkName ? '' : 'off'}`} onClick={() => discover({ owner: a.owner, app: a.linkName })}>{a.name}</button>
                  ))}
                </div>
              )}
              {sel.app && disc?.reports && (
                <div style={{ marginTop: 12, fontSize: '.88rem' }}>
                  <p><b>التقارير</b> (اختر تقرير الوحدات وضعه في <code>ZOHO_CREATOR_UNITS_REPORT</code>):</p>
                  <p>{disc.reports.map((r: any) => <code key={r.linkName} style={{ margin: 2, display: 'inline-block' }}>{r.linkName}</code>)}</p>
                  <p style={{ marginTop: 8 }}><b>النماذج</b> – اضغط لعرض الحقول:</p>
                  <div className="chips">{disc.forms?.map((f: any) => (
                    <button key={f.linkName} className={`chip ${sel.form === f.linkName ? '' : 'off'}`} onClick={() => discover({ ...sel, form: f.linkName })}>{f.name}</button>
                  ))}</div>
                  <p style={{ marginTop: 8 }}><code>ZOHO_CREATOR_OWNER={sel.owner}</code> <code>ZOHO_CREATOR_APP={sel.app}</code></p>
                </div>
              )}
              {sel.form && disc?.fields && (
                <div className="table-wrap" style={{ marginTop: 10 }}>
                  <table><thead><tr><th>الحقل</th><th>Link Name</th><th>النوع</th></tr></thead>
                    <tbody>{disc.fields.map((f: any) => <tr key={f.linkName}><td>{f.name}</td><td><code>{f.linkName}</code></td><td>{f.type}</td></tr>)}</tbody>
                  </table>
                </div>
              )}
            </>
          )}
          <details style={{ marginTop: 14 }}>
            <summary style={{ cursor: 'pointer', color: 'var(--ink-2)' }}>ربط الحقول الحالي (src/config/mapping.ts)</summary>
            <dl className="kv">{Object.entries(fields).map(([k, v]) => <Fragment key={k}><dt>{k}</dt><dd><code>{v}</code></dd></Fragment>)}</dl>
          </details>
        </div>
      </section>
    </>
  );
}
