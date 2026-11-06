import Link from 'next/link';

export function ErrorNotice({ error }: { error: unknown }) {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    <div className="notice err">
      <b>تعذّر تحميل البيانات من Zoho.</b>
      <p style={{ marginTop: 6 }}>{msg}</p>
      <p style={{ marginTop: 6 }}>راجع <Link href="/settings"><u>صفحة الربط والإعدادات</u></Link> لفحص الاتصال.</p>
    </div>
  );
}
