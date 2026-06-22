'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckSquare, GraduationCap, FileText } from 'lucide-react';

export default function FacultyDashboard() {
  const [profile, setProfile] = useState<{ name: string; employeeId: string; branch: { name: string }; assignments: { section: { name: string }; subject: { name: string; code: string }; isClassTeacher: boolean }[] } | null>(null);
  useEffect(() => { fetch('/api/auth/me').then(r => r.json()).then(d => setProfile(d.profile)).catch(console.error); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Welcome, {profile?.name || '—'}</h1>
        <p className="text-secondary text-sm">{profile?.employeeId} · {profile?.branch?.name}</p>
      </div>

      {profile?.assignments && profile.assignments.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-3">Current Assignments</h2>
          <div className="space-y-2">
            {profile.assignments.map((a, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-xl">
                <div><p className="text-sm font-semibold text-ink">{a.subject.code} — {a.subject.name}</p><p className="text-xs text-muted">Section {a.section.name}</p></div>
                {a.isClassTeacher && <span className="text-[10px] font-bold text-orange bg-orange-light px-2 py-0.5 rounded-full">CT</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Mark Attendance', desc: 'Daily subject-wise', icon: <CheckSquare size={20} />, href: '/dashboard/faculty/attendance' },
          { label: 'My Students', desc: 'View sections', icon: <GraduationCap size={20} />, href: '/dashboard/faculty/students' },
          { label: 'Documents', desc: 'Review submissions', icon: <FileText size={20} />, href: '/dashboard/faculty/documents' },
        ].map(c => (
          <Link key={c.href} href={c.href}>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow group">
              <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center mb-3 group-hover:bg-blue group-hover:shadow-md group-hover:shadow-blue/20 transition-all">
                <span className="text-secondary group-hover:text-white transition-colors">{c.icon}</span>
              </div>
              <p className="font-semibold text-sm text-ink">{c.label}</p>
              <p className="text-xs text-muted mt-0.5">{c.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
