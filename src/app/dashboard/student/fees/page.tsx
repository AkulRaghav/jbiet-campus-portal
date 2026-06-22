'use client';

import { useEffect, useState } from 'react';
import { CreditCard } from 'lucide-react';

interface FeeRecord {
  id: string;
  category: string;
  semester: number;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  scholarshipAmount: number;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function StudentFeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/fees').then(r => r.json()).then(d => setFees(d.feeRecords || [])).catch(console.error).finally(() => setLoading(false));

    // Load Razorpay script
    if (!document.getElementById('razorpay-script')) {
      const script = document.createElement('script');
      script.id = 'razorpay-script';
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      document.head.appendChild(script);
    }
  }, []);

  const handlePay = async (fee: FeeRecord) => {
    setPaying(fee.id);
    setMessage('');

    const amountDue = fee.totalAmount - fee.paidAmount - fee.scholarshipAmount;
    if (amountDue <= 0) { setPaying(null); return; }

    try {
      // Step 1: Create Razorpay order (server-side)
      const orderRes = await fetch('/api/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amountDue, purpose: 'FEE_PAYMENT', metadata: { feeId: fee.id, category: fee.category } }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) { setMessage(orderData.error || 'Failed to create order'); setPaying(null); return; }

      // Step 2: Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'JBIET',
        description: `${fee.category} Fee - Sem ${fee.semester}`,
        order_id: orderData.order.id,
        handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
          // Step 3: Verify payment server-side
          const verifyRes = await fetch('/api/payments/verify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...response, purpose: 'FEE_PAYMENT', feeId: fee.id }),
          });
          const verifyData = await verifyRes.json();
          if (verifyRes.ok) {
            setMessage(`✓ ${fee.category} fee paid successfully!`);
            // Refresh fees
            const refreshed = await fetch('/api/fees');
            const refreshData = await refreshed.json();
            setFees(refreshData.feeRecords || []);
          } else {
            setMessage(`Payment verification failed: ${verifyData.error}`);
          }
          setPaying(null);
        },
        modal: { ondismiss: () => setPaying(null) },
        theme: { color: '#3B6FF2' },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch {
      setMessage('Payment failed. Try again.');
      setPaying(null);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading fees...</div>;

  const totalDue = fees.reduce((s, f) => s + Math.max(0, f.totalAmount - f.paidAmount - f.scholarshipAmount), 0);
  const totalPaid = fees.reduce((s, f) => s + f.paidAmount, 0);

  const categoryLabels: Record<string, string> = { TUITION: 'Tuition Fee', EXAM: 'Exam Fee', BUS: 'Bus Fee', HOSTEL: 'Hostel Fee', LIBRARY: 'Library Fee', LAB: 'Lab Fee', OTHER: 'Other' };
  const statusColor: Record<string, string> = { PAID: 'bg-success-light text-success', UNPAID: 'bg-danger-light text-danger', PARTIAL: 'bg-orange-light text-orange' };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink flex items-center gap-2"><CreditCard size={20} className="text-blue" /> Fee Status</h1>

      {message && <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${message.startsWith('✓') ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>{message}</div>}

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-2xl border border-border p-4 shadow-sm">
          <p className="text-xs text-muted">Total Fees</p>
          <p className="text-xl font-bold text-ink">₹{fees.reduce((s, f) => s + f.totalAmount, 0).toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-2xl border border-success/20 p-4 shadow-sm">
          <p className="text-xs text-muted">Paid</p>
          <p className="text-xl font-bold text-success">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-card rounded-2xl border border-danger/20 p-4 shadow-sm">
          <p className="text-xs text-muted">Balance Due</p>
          <p className="text-xl font-bold text-danger">₹{Math.max(0, totalDue).toLocaleString()}</p>
        </div>
      </div>

      {/* Fee Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-surface">
            <tr>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-secondary uppercase">Category</th>
              <th className="px-4 py-3 text-left text-[10px] font-semibold text-secondary uppercase">Semester</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold text-secondary uppercase">Amount</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold text-secondary uppercase">Paid</th>
              <th className="px-4 py-3 text-right text-[10px] font-semibold text-secondary uppercase">Balance</th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold text-secondary uppercase">Status</th>
              <th className="px-4 py-3 text-center text-[10px] font-semibold text-secondary uppercase">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fees.map(fee => {
              const balance = Math.max(0, fee.totalAmount - fee.paidAmount - fee.scholarshipAmount);
              return (
                <tr key={fee.id}>
                  <td className="px-4 py-3 font-medium text-ink">{categoryLabels[fee.category] || fee.category}</td>
                  <td className="px-4 py-3 text-muted">Sem {fee.semester}</td>
                  <td className="px-4 py-3 text-right">₹{fee.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right text-success">₹{fee.paidAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-right font-medium">{balance > 0 ? `₹${balance.toLocaleString()}` : '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusColor[fee.status] || ''}`}>{fee.status}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {fee.status !== 'PAID' && balance > 0 && (
                      <button onClick={() => handlePay(fee)} disabled={paying === fee.id}
                        className="bg-blue hover:bg-blue-hover text-white px-3 py-1 rounded-lg text-[10px] font-bold disabled:opacity-50 shadow-sm">
                        {paying === fee.id ? '...' : 'Pay Now'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-muted">Payments powered by Razorpay (test mode). Server-side signature verification ensures payment integrity.</p>
    </div>
  );
}
