'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

const LINKS = [
  { href: '/', label: 'لوحة التحكم', icon: '📊' },
  { href: '/map', label: 'الخارطة الحيّة', icon: '🗺️' },
  { href: '/invoices', label: 'الفواتير', icon: '🧾' },
  { href: '/settings', label: 'الربط والإعدادات', icon: '⚙️' },
];

export function Sidebar({ mode, canLogout }: { mode: 'mock' | 'zoho'; canLogout: boolean }) {
  const path = usePathname();
  const router = useRouter();
  return (
    <aside className="side">
      <div className="brand">
        <span className="brand-mark">R</span>
        <span>رافل<small>CONTROL CENTER</small></span>
      </div>
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={`nav-link ${path === l.href ? 'active' : ''}`}>
          <span aria-hidden>{l.icon}</span>{l.label}
        </Link>
      ))}
      <div className="side-foot">
        <Link href="/settings" className={`mode-pill ${mode === 'zoho' ? 'live' : ''}`}>
          <span className="dot" />{mode === 'zoho' ? 'مربوط بـ Zoho' : 'بيانات تجريبية'}
        </Link>
        {canLogout && (
          <button className="btn ghost sm" onClick={async () => { await fetch('/api/logout', { method: 'POST' }); router.push('/login'); }}>
            تسجيل الخروج
          </button>
        )}
      </div>
    </aside>
  );
}
