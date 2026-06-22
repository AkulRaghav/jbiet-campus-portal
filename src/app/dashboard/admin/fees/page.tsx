'use client';

import { useEffect, useState } from 'react';

interface Student {
  id: string;
  registrationNo: string;
  name: string;
}

export default function AdminFeesPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('TUITION');
  const [semester, setSemester] = useState(3);
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [totalAmount, setTotalAmount] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const searchStudents = () => {
    if (search.length < 2) return;
    fetch(`/api/students?search=${search}&limit=10`)
      .then(r => r.json())
      .then(d => setStudents(d.students || []))
      .catch(console.error);
  };

  useEffect(() => {
    if (search.length >= 2) {
      const timer = setTimeout(searchStudents, 300);
      return () => clearTimeout(timer);
    }
  }, [search]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !totalAmount) {
      setMessage('Select a student and enter amount');
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          category,
          semester,
          academicYear,
          totalAmount: parseFloat(totalAmount),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Fee record created');
        setTotalAmount('');
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage('❌ Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Fee Management</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="font-semibold text-gray-700 mb-4">Create Fee Record</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Search Student</label>
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Type roll number or name..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
              {students.length > 0 && (
                <div className="mt-1 border rounded-lg max-h-32 overflow-y-auto">
                  {students.map(s => (
                    <button key={s.id} type="button"
                      onClick={() => { setSelectedStudent(s.id); setSearch(`${s.registrationNo} - ${s.name}`); setStudents([]); }}
                      className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-50 border-b last:border-0">
                      {s.registrationNo} — {s.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
                <option value="TUITION">Tuition Fee</option>
                <option value="EXAM">Exam Fee</option>
                <option value="BUS">Bus Fee</option>
                <option value="HOSTEL">Hostel Fee</option>
                <option value="LIBRARY">Library Fee</option>
                <option value="LAB">Lab Fee</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Semester</label>
              <select value={semester} onChange={e => setSemester(parseInt(e.target.value))}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
                {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Academic Year</label>
              <input type="text" value={academicYear} onChange={e => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Total Amount (₹)</label>
              <input type="number" value={totalAmount} onChange={e => setTotalAmount(e.target.value)}
                placeholder="e.g. 75000" className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
          </div>

          {message && <p className="text-sm">{message}</p>}

          <button type="submit" disabled={loading}
            className="bg-[#e5a100] hover:bg-[#d4940a] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 text-sm">
            {loading ? 'Creating...' : 'Create Fee Record'}
          </button>
        </form>
      </div>
    </div>
  );
}
