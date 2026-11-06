import { Sidebar } from '@/components/Sidebar';
import { getDataSource } from '@/lib/data';
import { authRequired } from '@/lib/session';

export const dynamic = 'force-dynamic';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="shell">
      <Sidebar mode={getDataSource().mode} canLogout={authRequired()} />
      <main className="main">{children}</main>
    </div>
  );
}
