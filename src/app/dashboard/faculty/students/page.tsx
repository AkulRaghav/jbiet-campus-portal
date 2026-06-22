'use client';

import { useEffect, useState } from 'react';

interface Assignment {
  sectionId: string;
  section: { id: string; name: string };
  subject: { name: string; code: string };
}

interface Student {
  id: string;
  registrationNo: string;
  name: string;
  mobileNo: string | null;
}

export default function FacultyStudentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedSection, setSelectedSection] = useState('');
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.profile?.assignments) {
          setAssignments(data.profile.assignments);
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedSection) {
      setLoading(true);
      fetch(`/api/students?sectionId=${selectedSection}&limit=100`)
        .then(r => r.json())
        .then(d => setStudents(d.students || []))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [selectedSection]);

  // Get unique sections
  const uniqueSections = assignments.reduce((acc, a) => {
    if (!acc.find(s => s.id === a.sectionId)) {
      acc.push(a.section);
    }
    return acc;
  }, [] as { id: string; name: string }[]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">My Students</h1>

      {/* Section Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Section</label>
        <div className="flex gap-3 flex-wrap">
          {uniqueSections.length === 0 ? (
            <p className="text-gray-500 text-sm">No sections assigned. Contact admin.</p>
          ) : (
            uniqueSections.map(sec => (
              <button
                key={sec.id}
                onClick={() => setSelectedSection(sec.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedSection === sec.id
                    ? 'bg-[#1f4e5f] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Section {sec.name}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Students List */}
      {selectedSection && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading...</div>
          ) : (
            <table className="w-full">
              <thead className="bg-[#1f4e5f] text-white">
                <tr>
                  <th className="px-4 py-3 text-left text-sm">#</th>
                  <th className="px-4 py-3 text-left text-sm">Roll Number</th>
                  <th className="px-4 py-3 text-left text-sm">Name</th>
                  <th className="px-4 py-3 text-left text-sm">Mobile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map((s, i) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3 text-sm font-mono font-medium text-[#1f4e5f]">{s.registrationNo}</td>
                    <td className="px-4 py-3 text-sm">{s.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{s.mobileNo || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
