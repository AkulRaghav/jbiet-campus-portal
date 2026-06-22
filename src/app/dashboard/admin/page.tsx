'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { GraduationCap, UsersRound, Building2, Megaphone, UserPlus, UserCog, FileEdit } from 'lucide-react';

function DonutRing({ percent, size = 44, stroke = 4 }: { percent: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} className="ring-progress">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F5A623" strokeWidth={stroke} opacity={0.2} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#3B6FF2" strokeWidth={stroke}
        strokeDasharray={`${(percent/100)*circ} ${circ}`} strokeLinecap="round" />
    </svg>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalStudents: 0, totalFaculty: 0, totalBranches: 0, recentNotices: 0 });

  useEffect(() => {
    Promise.all([
      fetch('/api/students?limit=1').then(r => r.json()),
      fetch('/api/faculty').then(r => r.json()),
      fetch('/api/branches').then(r => r.json()),
      fetch('/api/notices?limit=5').then(r => r.json()),
    ]).then(([s, f, b, n]) => {
      setStats({ totalStudents: s.pagination?.total || 0, totalFaculty: f.faculty?.length || 0, totalBranches: b.branches?.length || 0, recentNotices: n.notices?.length || 0 });
    }).catch(console.error);
  }, []);

  const cards = [
    { label: 'Students', value: stats.totalStudents, icon: <GraduationCap size={20} />, href: '/dashboard/admin/students', pct: 75 },
    { label: 'Faculty', value: stats.totalFaculty, icon: <UsersRound size={20} />, href: '/dashboard/admin/faculty', pct: 45 },
    { label: 'Branches', value: stats.totalBranches, icon: <Building2 size={20} />, href: '/dashboard/admin/sections', pct: 100 },
    { label: 'Notices', value: stats.recentNotices, icon: <Megaphone size={20} />, href: '/dashboard/admin/notices', pct: 60 },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-ink">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map(c => (
          <Link key={c.label} href={c.href}>
            <div className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-secondary text-xs font-medium">{c.label}</p>
                  <p className="stat-number text-2xl text-ink mt-1">{c.value}</p>
                </div>
                <div className="relative">
                  <DonutRing percent={c.pct} />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-secondary group-hover:text-blue transition-colors">{c.icon}</span>
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-ink">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { label: 'Add Student', desc: 'Create new profile', icon: <UserPlus size={18} />, href: '/dashboard/admin/students/new' },
            { label: 'Add Faculty', desc: 'Register member', icon: <UserCog size={18} />, href: '/dashboard/admin/faculty/new' },
            { label: 'Post Notice', desc: 'Publish update', icon: <FileEdit size={18} />, href: '/dashboard/admin/notices' },
          ].map(a => (
            <Link key={a.href} href={a.href}>
              <div className="flex items-center gap-3 p-4 rounded-xl hover:bg-blue-light transition-colors border border-border group">
                <div className="w-10 h-10 rounded-xl bg-surface flex items-center justify-center group-hover:bg-blue group-hover:shadow-md group-hover:shadow-blue/20 transition-all">
                  <span className="text-secondary group-hover:text-white transition-colors">{a.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{a.label}</p>
                  <p className="text-[11px] text-muted">{a.desc}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
