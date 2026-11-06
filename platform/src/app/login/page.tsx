'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get('next') || '/';
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  return (
    <form className="card" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr('');
      const r = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: pw }) });
      const j = await r.json();
      setBusy(false);
      if (r.ok) router.replace(next.startsWith('/') ? next : '/'); else setErr(j.error);
    }}>
      <div className="brand" style={{ justifyContent: 'center' }}><span className="brand-mark">R</span><span>رافل<small>CONTROL CENTER</small></span></div>
      <div className="field"><label>كلمة المرور</label><input className="input" type="password" autoFocus value={pw} onChange={(e) => setPw(e.target.value)} /></div>
      {err && <div className="notice err">{err}</div>}
      <button className="btn" style={{ width: '100%' }} disabled={busy}>دخول</button>
    </form>
  );
}

export default function LoginPage() {
  return <div className="login"><Suspense><LoginForm /></Suspense></div>;
}
