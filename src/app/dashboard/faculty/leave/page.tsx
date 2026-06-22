'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle, XCircle, Clock } from 'lucide-react';

interface LeaveApp { id: string; leaveType: string; fromDate: string; toDate: string; totalDays: number; reason: string; status: string; appliedAt: string; reviewerComments: string | null; }
interface LeaveBalance { leaveType: string; totalAllotted: number; used: number; }

const leaveTypeLabels: Record<string, string> = { CL: 'Casual Leave', EL: 'Earned Leave', ML: 'Medical Leave', OD: 'On Duty', SCL: 'Special Casual' };

export default function FacultyLeavePage() {
  const [applications, setApplications] = useState<LeaveApp[]>([]);
  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ leaveType: 'CL', fromDate: '', toDate: '', reason: '' });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    fetch('/api/leave').then(r => r.json()).then(d => { setApplications(d.applications || []); setBalances(d.balances || []); }).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setMessage('');
    const res = await fetch('/api/leave', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const data = await res.json();
    if (res.ok) { setMessage('Leave application submitted!'); setShowForm(false); setForm({ leaveType: 'CL', fromDate: '', toDate: '', reason: '' }); fetchData(); }
    else setMessage(data.error || 'Failed');
  };

  const statusIcon = (s: string) => s === 'APPROVED' ? <CheckCircle size={14} className="text-success" /> : s === 'REJECTED' ? <XCircle size={14} className="text-danger" /> : <Clock size={14} className="text-orange" />;

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink flex items-center gap-2"><CalendarDays size={20} className="text-blue" /> Leave Management</h1>
        <button onClick={() => setShowForm(!showForm)} className="bg-blue hover:bg-blue-hover text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm">
          {showForm ? 'Cancel' : '+ Apply Leave'}
        </button>
      </div>

      {/* Leave Balances */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {['CL', 'EL', 'ML', 'OD', 'SCL'].map(type => {
          const bal = balances.find(b => b.leaveType === type);
          const used = bal?.used || 0;
          const total = bal?.totalAllotted || 12;
          return (
            <div key={type} className="bg-card rounded-xl border border-border p-3 shadow-sm text-center">
              <p className="text-[10px] text-secondary uppercase font-semibold">{type}</p>
              <p className="text-lg font-bold text-ink">{total - used}<span className="text-xs text-muted font-normal">/{total}</span></p>
              <div className="mt-1.5 w-full bg-surface rounded-full h-1.5">
                <div className={`h-1.5 rounded-full ${used/total > 0.8 ? 'bg-danger' : 'bg-blue'}`} style={{ width: `${(used/total)*100}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Apply Form */}
      {showForm && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-4">New Leave Application</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Leave Type</label>
              <select value={form.leaveType} onChange={e => setForm(p => ({ ...p, leaveType: e.target.value }))}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none">
                {Object.entries(leaveTypeLabels).map(([k, v]) => <option key={k} value={k}>{v} ({k})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">From Date</label>
              <input type="date" value={form.fromDate} onChange={e => setForm(p => ({ ...p, fromDate: e.target.value }))}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none" required />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">To Date</label>
              <input type="date" value={form.toDate} onChange={e => setForm(p => ({ ...p, toDate: e.target.value }))}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Reason</label>
              <textarea value={form.reason} onChange={e => setForm(p => ({ ...p, reason: e.target.value }))}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none" rows={2} required />
            </div>
            {message && <p className="md:col-span-2 text-sm text-blue">{message}</p>}
            <button type="submit" className="bg-blue hover:bg-blue-hover text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-sm">Submit Application</button>
          </form>
        </div>
      )}

      {/* Applications History */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border"><h2 className="text-sm font-bold text-ink">Leave History</h2></div>
        {applications.length === 0 ? (
          <div className="p-8 text-center text-muted text-sm">No leave applications yet.</div>
        ) : (
          <div className="divide-y divide-border">
            {applications.map(app => (
              <div key={app.id} className="px-5 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {statusIcon(app.status)}
                  <div>
                    <p className="text-sm font-medium text-ink">{leaveTypeLabels[app.leaveType] || app.leaveType} — {app.totalDays} day{app.totalDays > 1 ? 's' : ''}</p>
                    <p className="text-[10px] text-muted">{new Date(app.fromDate).toLocaleDateString('en-IN')} → {new Date(app.toDate).toLocaleDateString('en-IN')} · {app.reason.slice(0, 50)}</p>
                    {app.reviewerComments && <p className="text-[10px] text-secondary mt-0.5 italic">Review: {app.reviewerComments}</p>}
                  </div>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${app.status === 'APPROVED' ? 'bg-success-light text-success' : app.status === 'REJECTED' ? 'bg-danger-light text-danger' : 'bg-orange-light text-orange'}`}>{app.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
