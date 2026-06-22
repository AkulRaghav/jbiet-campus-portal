'use client';

import { useEffect, useState } from 'react';

interface FeeRecord {
  id: string;
  semester: number;
  totalAmount: number;
  paidAmount: number;
  status: string;
  student: { registrationNo: string; name: string };
}

export default function BusProviderDashboard() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fees')
      .then(r => r.json())
      .then(data => setFees(data.feeRecords || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const updateBusFee = async (feeId: string, newStatus: string) => {
    const fee = fees.find(f => f.id === feeId);
    if (!fee) return;

    await fetch('/api/fees', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        feeId,
        status: newStatus,
        paidAmount: newStatus === 'PAID' ? fee.totalAmount : 0,
      }),
    });

    setFees(prev => prev.map(f => f.id === feeId ? { ...f, status: newStatus } : f));
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-2">Bus Fee Management</h1>
      <p className="text-gray-500 text-sm mb-6">View and manage bus fee payments only</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1f4e5f] text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Roll Number</th>
              <th className="px-4 py-3 text-left text-sm">Student Name</th>
              <th className="px-4 py-3 text-center text-sm">Semester</th>
              <th className="px-4 py-3 text-right text-sm">Amount</th>
              <th className="px-4 py-3 text-center text-sm">Status</th>
              <th className="px-4 py-3 text-center text-sm">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fees.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-gray-500">No bus fee records</td></tr>
            ) : (
              fees.map(fee => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono">{fee.student.registrationNo}</td>
                  <td className="px-4 py-3 text-sm">{fee.student.name}</td>
                  <td className="px-4 py-3 text-center text-sm">{fee.semester}</td>
                  <td className="px-4 py-3 text-right text-sm">₹{fee.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      fee.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {fee.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {fee.status !== 'PAID' ? (
                      <button
                        onClick={() => updateBusFee(fee.id, 'PAID')}
                        className="bg-green-500 text-white px-3 py-1 rounded text-xs hover:bg-green-600"
                      >
                        Mark Paid
                      </button>
                    ) : (
                      <button
                        onClick={() => updateBusFee(fee.id, 'UNPAID')}
                        className="bg-gray-200 text-gray-600 px-3 py-1 rounded text-xs hover:bg-gray-300"
                      >
                        Mark Unpaid
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
