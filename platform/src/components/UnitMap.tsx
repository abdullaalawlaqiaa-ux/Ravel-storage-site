'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import type { DisplayState, EnrichedUnit } from '@/lib/types';
import { layoutUnits } from '@/lib/layout';
import { DISPLAY_LABEL, SIZE_LABEL, money, num } from '@/lib/format';
import { UnitDrawer } from './UnitDrawer';

const STATES: DisplayState[] = ['available', 'occupied', 'reserved', 'expiring', 'overdue', 'maintenance'];
const ICON: Record<DisplayState, string> = { available: '✓', occupied: '●', reserved: '◐', expiring: '⏳', overdue: '!', maintenance: '🔧' };
const fill = (s: DisplayState) => `var(--st-${s})`;
const textOn = (s: DisplayState) => (s === 'reserved' ? 'var(--st-text-dark)' : 'var(--st-text)');

export function UnitMap() {
  const params = useSearchParams();
  const [units, setUnits] = useState<EnrichedUnit[]>([]);
  const [mode, setMode] = useState<'mock' | 'zoho'>('mock');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatedAt, setUpdatedAt] = useState<string>('');
  const [zone, setZone] = useState('all');
  const [hidden, setHidden] = useState<Set<DisplayState>>(new Set());
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const [tip, setTip] = useState<{ u: EnrichedUnit; x: number; y: number } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await fetch('/api/units', { cache: 'no-store' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setUnits(j.units); setMode(j.mode); setErr(null);
      setUpdatedAt(new Date(j.at).toLocaleTimeString('ar-SA-u-nu-latn', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) { setErr((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    const code = params.get('unit');
    if (code && units.length && !selId) {
      const u = units.find((x) => x.code.toUpperCase() === code.toUpperCase());
      if (u) setSelId(u.id);
    }
  }, [params, units, selId]);

  const zones = useMemo(() => [...new Set(units.map((u) => u.zone))].sort(), [units]);
  const visible = useMemo(() => (zone === 'all' ? units : units.filter((u) => u.zone === zone)), [units, zone]);
  const layout = useMemo(() => layoutUnits(visible), [visible]);
  const counts = useMemo(() => {
    const c = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<DisplayState, number>;
    for (const u of visible) c[u.display]++;
    return c;
  }, [visible]);

  const needle = q.trim().toLowerCase();
  const matches = (u: EnrichedUnit) =>
    !hidden.has(u.display) &&
    (!needle || u.code.toLowerCase().includes(needle) || (u.customerName ?? '').toLowerCase().includes(needle) || (u.customerPhone ?? '').includes(needle));

  const selected = units.find((u) => u.id === selId) ?? null;
  const toggle = (s: DisplayState) => setHidden((h) => { const n = new Set(h); n.has(s) ? n.delete(s) : n.add(s); return n; });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>الخارطة الحيّة</h1>
          <p>{loading ? 'جارٍ التحميل…' : `${num(visible.length)} وحدة · آخر تحديث ${updatedAt} · تتحدّث تلقائياً كل دقيقة`}</p>
        </div>
        <div className="row">
          <span className={`mode-pill ${mode === 'zoho' ? 'live' : ''}`}><span className="dot" />{mode === 'zoho' ? 'Zoho Creator' : 'تجريبي'}</span>
          <button className="btn ghost sm" onClick={load}>↻ تحديث</button>
        </div>
      </div>
      {err && <div className="notice err">{err}</div>}

      <div className="map-layout">
        <div className="card">
          <div className="map-toolbar">
            <input className="input" placeholder="ابحث برقم الوحدة أو اسم العميل أو الجوال" value={q} onChange={(e) => setQ(e.target.value)} />
            <select className="input" value={zone} onChange={(e) => setZone(e.target.value)} aria-label="المنطقة">
              <option value="all">كل المناطق</option>
              {zones.map((z) => <option key={z} value={z}>منطقة {z}</option>)}
            </select>
          </div>
          <div className="chips" style={{ marginBottom: 12 }}>
            {STATES.map((s) => (
              <button key={s} className={`chip ${hidden.has(s) ? 'off' : ''}`} onClick={() => toggle(s)} aria-pressed={!hidden.has(s)}>
                <i style={{ background: fill(s) }} />{ICON[s]} {DISPLAY_LABEL[s]} <b>{counts[s]}</b>
              </button>
            ))}
          </div>

          <div className="map-canvas" onMouseLeave={() => setTip(null)}>
            {layout.placed.length > 0 && (
              <svg viewBox={`0 0 ${layout.width} ${layout.height}`} role="img" aria-label="خارطة الوحدات من الأعلى">
                {layout.zones.map((z) => (
                  <g key={z.zone}>
                    <rect x={z.x + 0.1} y={z.y - 0.3} width={z.w - 0.2} height={z.h + 0.6} rx={0.4} fill="var(--zone)" />
                    <text x={z.x + z.w / 2} y={z.y - 0.8} fontSize={1.1} textAnchor="middle" className="zone-label">منطقة {z.zone}</text>
                  </g>
                ))}
                {layout.placed.map(({ unit: u, x, y, w, h }) => {
                  const fs = Math.max(0.42, Math.min(w * 0.22, h * 0.32, 0.9));
                  const on = matches(u);
                  return (
                    <g
                      key={u.id}
                      className={`unit-rect ${on ? '' : 'dim'} ${selId === u.id ? 'sel' : ''}`}
                      onClick={() => setSelId(u.id)}
                      onMouseMove={(e) => setTip({ u, x: e.clientX, y: e.clientY })}
                      onMouseLeave={() => setTip(null)}
                      tabIndex={0}
                      role="button"
                      aria-label={`${u.code} – ${DISPLAY_LABEL[u.display]}`}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelId(u.id); }}
                    >
                      <rect className="u" x={x} y={y} width={w} height={h} rx={0.18} fill={fill(u.display)}
                        stroke="var(--floor)" strokeWidth={0.06} />
                      <text className="unit-label" x={x + w / 2} y={y + h / 2 + fs * 0.35} fontSize={fs} textAnchor="middle" fill={textOn(u.display)}>
                        {u.code}
                      </text>
                      {(u.display === 'overdue' || u.display === 'maintenance' || u.display === 'expiring') && h > 1.4 && (
                        <text className="unit-label" x={x + w / 2} y={y + h / 2 + fs * 1.45} fontSize={fs * 0.8} textAnchor="middle" fill={textOn(u.display)}>
                          {ICON[u.display]}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
            {!loading && !layout.placed.length && <div className="empty">لا توجد وحدات</div>}
          </div>
        </div>

        <div className="drawer">
          {selected ? (
            <UnitDrawer key={selected.id} unit={selected} onClose={() => setSelId(null)} onDone={load} />
          ) : (
            <div className="card">
              <h2>اختر وحدة</h2>
              <p style={{ color: 'var(--ink-3)' }}>اضغط على أي وحدة في الخارطة لعرض تفاصيلها: العميل والعقد والرصيد، ثم احجز أو مدّد أو أخلِ أو أصدر فاتورة مباشرة.</p>
              <dl className="kv" style={{ marginTop: 16 }}>
                <dt>المتاح الآن</dt><dd className="num">{counts.available} وحدة</dd>
                <dt>متأخر السداد</dt><dd className="num">{counts.overdue} وحدة</dd>
                <dt>ينتهي قريباً</dt><dd className="num">{counts.expiring} وحدة</dd>
              </dl>
            </div>
          )}
        </div>
      </div>

      {tip && (
        <div className="tip" style={{ top: tip.y + 14, left: tip.x + 14 }}>
          <b>{tip.u.code} · {SIZE_LABEL[tip.u.size]}</b>
          <div>{ICON[tip.u.display]} {DISPLAY_LABEL[tip.u.display]}</div>
          {tip.u.customerName && <div>{tip.u.customerName}</div>}
          {tip.u.balanceDue > 0 && <div style={{ color: 'var(--danger)' }}>مستحق: {money(tip.u.balanceDue)}</div>}
          <div style={{ color: 'var(--ink-3)' }}>{money(tip.u.monthlyPrice)} / شهر</div>
        </div>
      )}
    </>
  );
}
