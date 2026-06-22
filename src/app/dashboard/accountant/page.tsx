'use client';

import { useEffect, useState } from 'react';

interface FeeRecord {
  id: string;
  category: string;
  semester: number;
  academicYear: string;
  totalAmount: number;
  paidAmount: number;
  status: string;
  student: { registrationNo: string; name: string };
}

export default function AccountantDashboard() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [filter, setFilter] = useState('UNPAID');

  useEffect(() => {
    fetch(`/api/fees?status=${filter}`)
      .then(r => r.json())
      .then(data => setFees(data.feeRecords || []))
      .catch(console.error);
  }, [filter]);

  const updateFee = async (feeId: string, status: string) => {
    const fee = fees.find(f => f.id === feeId);
    if (!fee) return;

    await fetch('/api/fees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feeId,
        status,
        paidAmount: status === 'PAID' ? fee.totalAmount : fee.paidAmount,
      }),
    });

    // Refresh
    setFees(prev => prev.filter(f => f.id !== feeId));
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Accountant Dashboard</h1>

      <div className="flex gap-3 mb-6">
        {['UNPAID', 'PARTIAL', 'PAID'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === s ? 'bg-[#1f4e5f] text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Roll No.</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Student</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Category</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Amount</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Paid</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fees.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No records</td></tr>
            ) : (
              fees.map(fee => (
                <tr key={fee.id}>
                  <td className="px-4 py-3 text-sm font-mono">{fee.student.registrationNo}</td>
                  <td className="px-4 py-3 text-sm">{fee.student.name}</td>
                  <td className="px-4 py-3 text-sm">{fee.category}</td>
                  <td className="px-4 py-3 text-sm text-right">₹{fee.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right">₹{fee.paidAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    {fee.status !== 'PAID' && (
                      <button
                        onClick={() => updateFee(fee.id, 'PAID')}
                        className="bg-green-100 text-green-700 px-3 py-1 rounded text-xs font-medium hover:bg-green-200"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
