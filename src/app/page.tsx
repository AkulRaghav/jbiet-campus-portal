'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { LogIn, FileText, Mail, Phone, Globe } from 'lucide-react';

interface Notice { id: string; title: string; content: string | null; fileUrl: string | null; isNew: boolean; publishedAt: string; }

export default function HomePage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  useEffect(() => { fetch('/api/notices?limit=15').then(r => r.json()).then(d => setNotices(d.notices || [])).catch(console.error); }, []);

  return (
    <div className="min-h-screen bg-surface">
      <header className="bg-card border-b border-border sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue flex items-center justify-center shadow-md shadow-blue/20">
              <span className="text-white font-bold text-sm">JB</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="text-sm font-bold text-ink">JB Institute of Engineering & Technology <span className="text-blue text-xs font-semibold">(UGC Autonomous)</span></h1>
              <p className="text-[10px] text-muted">NAAC Accredited · AICTE Approved · Affiliated to JNTUH</p>
            </div>
          </div>
          <Link href="/login" className="flex items-center gap-2 bg-blue hover:bg-blue-hover text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors shadow-md shadow-blue/20">
            <LogIn size={15} /><span>Login</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                <FileText size={15} className="text-blue" />
                <h3 className="text-sm font-bold text-ink">Results / Downloads / Notifications</h3>
              </div>
              <div className="divide-y divide-border max-h-[500px] overflow-y-auto">
                {notices.length === 0 ? <div className="p-8 text-center text-muted text-sm">No notices.</div> : notices.map(n => (
                  <div key={n.id} className="px-5 py-3 hover:bg-surface/50 flex items-start gap-3 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {n.isNew && <span className="bg-blue text-white text-[9px] px-1.5 py-[1px] rounded font-bold uppercase">New</span>}
                        {n.fileUrl ? <a href={n.fileUrl} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-blue text-sm font-medium transition-colors truncate">{n.title}</a>
                          : <span className="text-ink text-sm font-medium truncate">{n.title}</span>}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted whitespace-nowrap">{new Date(n.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-5 shadow-sm h-fit">
            <h3 className="text-sm font-bold text-ink mb-4">Contact</h3>
            <div className="space-y-3">
              {[{ icon: <Mail size={14} />, text: 'exam@jbiet.edu.in' }, { icon: <Phone size={14} />, text: '+91-XXXXXXXXXX' }, { icon: <Globe size={14} />, text: 'www.jbiet.edu.in' }].map((c, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm text-secondary">
                  <div className="w-7 h-7 rounded-lg bg-blue-light flex items-center justify-center"><span className="text-blue">{c.icon}</span></div>
                  <span>{c.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border bg-card mt-8">
        <div className="max-w-7xl mx-auto px-4 py-4"><p className="text-center text-muted text-xs">© {new Date().getFullYear()} JB Institute of Engineering & Technology.</p></div>
      </footer>
    </div>
  );
}
