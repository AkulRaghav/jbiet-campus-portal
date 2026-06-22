'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';

interface UserInfo { id: string; username: string; role: string; email: string | null; mustChangePassword: boolean; }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => { if (data.user.mustChangePassword) { router.push('/change-password'); return; } setUser(data.user); })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="w-8 h-8 border-[3px] border-border border-t-blue rounded-full animate-spin" />
    </div>
  );
  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface">
      <Sidebar role={user.role} username={user.username} />
      <main className="lg:ml-[260px] min-h-screen p-4 lg:p-7">
        <div className="max-w-[1400px] mx-auto">{children}</div>
      </main>
    </div>
  );
}
