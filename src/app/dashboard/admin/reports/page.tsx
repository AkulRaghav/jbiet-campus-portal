'use client';

import { useEffect, useState } from 'react';
import { BarChart3, Users, Wallet, PieChart } from 'lucide-react';

interface ReportData {
  overview: { totalStudents: number; totalFaculty: number; totalBranches: number };
  fees: { totalExpected: number; totalCollected: number; collectionRate: number; byCategory: Record<string, { expected: number; collected: number }> };
  attendance: { avgAttendance: number; totalRecords: number };
  academics: { branchStats: { shortName: string; students: number; faculty: number; avgSgpa: number }[]; backlogRate: number; activeBacklogs: number };
}

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/reports').then(r => r.json()).then(setData).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading reports...</div>;
  if (!data) return <div className="p-8 text-center text-muted text-sm">Failed to load.</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-ink flex items-center gap-2"><BarChart3 size={20} className="text-blue" /> Reports & Analytics</h1>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <Users size={18} className="text-blue mb-2" />
          <p className="stat-number text-2xl">{data.overview.totalStudents}</p>
          <p className="text-xs text-muted">Total Students</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <Users size={18} className="text-orange mb-2" />
          <p className="text-2xl font-bold text-ink">{data.overview.totalFaculty}</p>
          <p className="text-xs text-muted">Faculty Members</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <Wallet size={18} className="text-success mb-2" />
          <p className="text-2xl font-bold text-success">{data.fees.collectionRate}%</p>
          <p className="text-xs text-muted">Fee Collection Rate</p>
        </div>
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <PieChart size={18} className="text-blue mb-2" />
          <p className="text-2xl font-bold text-ink">{data.attendance.avgAttendance}%</p>
          <p className="text-xs text-muted">Avg Attendance</p>
        </div>
      </div>

      {/* Fee Collection */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="text-sm font-bold text-ink mb-4">Fee Collection Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="bg-surface rounded-xl p-4">
            <p className="text-xs text-secondary">Total Expected</p>
            <p className="text-xl font-bold text-ink">₹{data.fees.totalExpected.toLocaleString()}</p>
          </div>
          <div className="bg-surface rounded-xl p-4">
            <p className="text-xs text-secondary">Total Collected</p>
            <p className="text-xl font-bold text-success">₹{data.fees.totalCollected.toLocaleString()}</p>
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(data.fees.byCategory).map(([cat, vals]) => (
            <div key={cat} className="flex items-center gap-3">
              <span className="text-xs text-secondary w-20">{cat}</span>
              <div className="flex-1 bg-surface rounded-full h-2">
                <div className="h-2 rounded-full bg-blue" style={{ width: `${vals.expected > 0 ? (vals.collected/vals.expected)*100 : 0}%` }} />
              </div>
              <span className="text-[10px] text-muted w-24 text-right">₹{vals.collected.toLocaleString()} / {vals.expected.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Branch-wise Performance */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="text-sm font-bold text-ink mb-4">Branch-wise Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold text-secondary uppercase">Branch</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-secondary uppercase">Students</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-secondary uppercase">Faculty</th>
                <th className="px-3 py-2 text-center text-[10px] font-semibold text-secondary uppercase">Avg SGPA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.academics.branchStats.map(b => (
                <tr key={b.shortName}>
                  <td className="px-3 py-2 font-medium text-ink">{b.shortName}</td>
                  <td className="px-3 py-2 text-center">{b.students}</td>
                  <td className="px-3 py-2 text-center">{b.faculty}</td>
                  <td className="px-3 py-2 text-center stat-number">{b.avgSgpa > 0 ? b.avgSgpa.toFixed(2) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center gap-4 text-xs text-secondary">
          <span>Backlog Rate: <span className="font-bold text-danger">{data.academics.backlogRate}%</span></span>
          <span>Active Backlogs: <span className="font-bold text-ink">{data.academics.activeBacklogs}</span></span>
        </div>
      </div>
    </div>
  );
}
