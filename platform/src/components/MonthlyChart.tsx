import { money } from '@/lib/format';

/** أعمدة مزدوجة: المفوتر مقابل المحصّل لآخر 6 أشهر (محور واحد) */
export function MonthlyChart({ months }: { months: { key: string; label: string; billed: number; collected: number }[] }) {
  const W = 520, H = 200, padB = 26, padT = 10, padX = 8;
  const max = Math.max(1, ...months.map((m) => m.billed));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const slot = (W - padX * 2) / months.length;
  const bw = Math.min(22, slot / 3);
  const y = (v: number) => padT + (H - padT - padB) * (1 - v / top);
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step);
  return (
    <div className="chart">
      <div className="legend">
        <span><i style={{ background: 'var(--series-1)' }} />المفوتر</span>
        <span><i style={{ background: 'var(--series-2)' }} />المحصّل</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="المفوتر والمحصّل شهرياً">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padX} x2={W - padX} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth={1} />
            <text x={W - padX} y={y(t) - 3} textAnchor="end">{t >= 1000 ? `${Math.round(t / 1000)}k` : t}</text>
          </g>
        ))}
        {months.map((m, i) => {
          const cx = padX + slot * i + slot / 2;
          return (
            <g key={m.key}>
              <rect x={cx - bw - 1} y={y(m.billed)} width={bw} height={Math.max(0, y(0) - y(m.billed))} rx={3} fill="var(--series-1)">
                <title>{`${m.label} – المفوتر: ${money(m.billed)}`}</title>
              </rect>
              <rect x={cx + 1} y={y(m.collected)} width={bw} height={Math.max(0, y(0) - y(m.collected))} rx={3} fill="var(--series-2)">
                <title>{`${m.label} – المحصّل: ${money(m.collected)}`}</title>
              </rect>
              <text x={cx} y={H - 8} textAnchor="middle">{m.label}</text>
            </g>
          );
        })}
        <line x1={padX} x2={W - padX} y1={y(0)} y2={y(0)} stroke="var(--ink-3)" strokeWidth={1} />
      </svg>
    </div>
  );
}

function niceStep(max: number) {
  const raw = max / 4;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * p;
}
