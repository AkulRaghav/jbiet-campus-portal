'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Student {
  id: string;
  registrationNo: string;
  name: string;
  batchYear: number;
  branch: { name: string; shortName: string };
  section: { name: string };
  mobileNo: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function StudentsListPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchStudents = (page = 1, searchQuery = '') => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (searchQuery) params.append('search', searchQuery);

    fetch(`/api/students?${params}`)
      .then(r => r.json())
      .then(data => {
        setStudents(data.students || []);
        setPagination(data.pagination || { page: 1, limit: 20, total: 0, totalPages: 0 });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchStudents(); }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchStudents(1, search);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1f4e5f]">Students</h1>
          <p className="text-gray-500 text-sm">Total: {pagination.total} students</p>
        </div>
        <Link
          href="/dashboard/admin/students/new"
          className="bg-[#e5a100] hover:bg-[#d4940a] text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          + Add Student
        </Link>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or roll number..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none"
          />
          <button type="submit" className="bg-[#1f4e5f] text-white px-6 py-2 rounded-lg hover:bg-[#163a48]">
            Search
          </button>
        </div>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : students.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No students found</div>
        ) : (
          <table className="w-full">
            <thead className="bg-[#1f4e5f] text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Roll Number</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Branch</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Section</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Batch</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Mobile</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-mono font-medium text-[#1f4e5f]">{s.registrationNo}</td>
                  <td className="px-4 py-3 text-sm">{s.name}</td>
                  <td className="px-4 py-3 text-sm">{s.branch.shortName}</td>
                  <td className="px-4 py-3 text-sm">{s.section.name}</td>
                  <td className="px-4 py-3 text-sm">{s.batchYear}</td>
                  <td className="px-4 py-3 text-sm">{s.mobileNo || '—'}</td>
                  <td className="px-4 py-3 text-center">
                    <Link href={`/dashboard/admin/students/${s.id}`} className="text-[#1f4e5f] hover:text-[#e5a100] text-sm font-medium">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => fetchStudents(pagination.page - 1, search)}
                disabled={pagination.page <= 1}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => fetchStudents(pagination.page + 1, search)}
                disabled={pagination.page >= pagination.totalPages}
                className="px-3 py-1 border rounded text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
