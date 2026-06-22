'use client';

import { useEffect, useState } from 'react';
import { History } from 'lucide-react';

interface FeeRecord { id: string; category: string; semester: number; academicYear: string; totalAmount: number; paidAmount: number; status: string; paidDate: string | null; transactionId: string | null; }

export default function TransactionsPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fees').then(r => r.json()).then(d => setFees(d.feeRecords || [])).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading...</div>;

  const paidFees = fees.filter(f => f.status === 'PAID');
  const categoryLabel: Record<string, string> = { TUITION: 'Tuition Fee', EXAM: 'Exam Fee', BUS: 'Bus Fee', HOSTEL: 'Hostel', LIBRARY: 'Library', LAB: 'Lab Fee', OTHER: 'Other' };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink flex items-center gap-2"><History size={20} className="text-blue" /> Transactions</h1>

      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <p className="text-sm font-bold text-ink">Payment History</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase">Date</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase">Category</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase">Semester</th>
                <th className="px-4 py-2.5 text-right text-[10px] font-semibold text-secondary uppercase">Amount</th>
                <th className="px-4 py-2.5 text-center text-[10px] font-semibold text-secondary uppercase">Status</th>
                <th className="px-4 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase">Transaction ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {fees.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-muted">No transactions recorded.</td></tr>
              ) : (
                fees.map(f => (
                  <tr key={f.id}>
                    <td className="px-4 py-2.5 text-xs text-muted">{f.paidDate ? new Date(f.paidDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-2.5 text-ink">{categoryLabel[f.category] || f.category}</td>
                    <td className="px-4 py-2.5 text-muted">Sem {f.semester}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">₹{f.paidAmount > 0 ? f.paidAmount.toLocaleString() : f.totalAmount.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${f.status === 'PAID' ? 'bg-success-light text-success' : f.status === 'PARTIAL' ? 'bg-orange-light text-orange' : 'bg-danger-light text-danger'}`}>{f.status}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted font-mono">{f.transactionId || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
