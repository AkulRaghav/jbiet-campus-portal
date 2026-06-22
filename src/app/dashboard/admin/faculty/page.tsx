'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface FacultyMember {
  id: string;
  name: string;
  employeeId: string;
  designation: string | null;
  qualifications: string | null;
  branch: { name: string; shortName: string };
}

export default function AdminFacultyPage() {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/faculty')
      .then(r => r.json())
      .then(data => setFaculty(data.faculty || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#1f4e5f]">Faculty Management</h1>
        <Link
          href="/dashboard/admin/faculty/new"
          className="bg-[#e5a100] hover:bg-[#d4940a] text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Faculty
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : faculty.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No faculty found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#1f4e5f] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm">Employee ID</th>
                <th className="px-4 py-3 text-left text-sm">Name</th>
                <th className="px-4 py-3 text-left text-sm">Branch</th>
                <th className="px-4 py-3 text-left text-sm">Designation</th>
                <th className="px-4 py-3 text-left text-sm">Qualifications</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {faculty.map(f => (
                <tr key={f.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-[#1f4e5f]">{f.employeeId}</td>
                  <td className="px-4 py-3 text-sm">{f.name}</td>
                  <td className="px-4 py-3 text-sm">{f.branch.shortName}</td>
                  <td className="px-4 py-3 text-sm">{f.designation || '—'}</td>
                  <td className="px-4 py-3 text-sm">{f.qualifications || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
