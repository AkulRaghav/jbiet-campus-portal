'use client';

import { useEffect, useState } from 'react';

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

export default function StudentFeesPage() {
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/fees')
      .then(r => r.json())
      .then(data => setFees(data.feeRecords || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading fee information...</div>;

  const totalDue = fees.reduce((sum, f) => sum + (f.totalAmount - f.paidAmount - f.scholarshipAmount), 0);
  const totalPaid = fees.reduce((sum, f) => sum + f.paidAmount, 0);

  const statusColor: Record<string, string> = {
    PAID: 'bg-green-100 text-green-700',
    UNPAID: 'bg-red-100 text-red-700',
    PARTIAL: 'bg-amber-100 text-amber-700',
  };

  const categoryLabels: Record<string, string> = {
    TUITION: 'Tuition Fee',
    EXAM: 'Exam Fee',
    BUS: 'Bus Fee',
    HOSTEL: 'Hostel Fee',
    LIBRARY: 'Library Fee',
    LAB: 'Lab Fee',
    OTHER: 'Other',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Fee Status</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-500">Total Fees</p>
          <p className="text-2xl font-bold text-[#1f4e5f]">₹{fees.reduce((s, f) => s + f.totalAmount, 0).toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-5">
          <p className="text-sm text-gray-500">Paid</p>
          <p className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-5">
          <p className="text-sm text-gray-500">Balance Due</p>
          <p className="text-2xl font-bold text-red-600">₹{Math.max(0, totalDue).toLocaleString()}</p>
        </div>
      </div>

      {/* Fee Records Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#1f4e5f] text-white">
            <tr>
              <th className="px-4 py-3 text-left text-sm">Category</th>
              <th className="px-4 py-3 text-left text-sm">Semester</th>
              <th className="px-4 py-3 text-right text-sm">Total</th>
              <th className="px-4 py-3 text-right text-sm">Scholarship</th>
              <th className="px-4 py-3 text-right text-sm">Paid</th>
              <th className="px-4 py-3 text-right text-sm">Balance</th>
              <th className="px-4 py-3 text-center text-sm">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {fees.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500">No fee records found</td></tr>
            ) : (
              fees.map(fee => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium">{categoryLabels[fee.category] || fee.category}</td>
                  <td className="px-4 py-3 text-sm">Sem {fee.semester}</td>
                  <td className="px-4 py-3 text-sm text-right">₹{fee.totalAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-purple-600">₹{fee.scholarshipAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right text-green-600">₹{fee.paidAmount.toLocaleString()}</td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    ₹{Math.max(0, fee.totalAmount - fee.paidAmount - fee.scholarshipAmount).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColor[fee.status] || ''}`}>
                      {fee.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 mt-4">
        Note: Exam fee cannot be paid until all other fees for the semester are cleared.
      </p>
    </div>
  );
}
