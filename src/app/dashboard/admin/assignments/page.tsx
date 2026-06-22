'use client';

import { useEffect, useState } from 'react';

interface Branch {
  id: string;
  name: string;
  shortName: string;
  sections: { id: string; name: string; batchYear: number }[];
}

interface Subject {
  id: string;
  name: string;
  code: string;
}

interface FacultyMember {
  id: string;
  name: string;
  employeeId: string;
}

export default function AdminAssignmentsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [semester, setSemester] = useState(3);
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [assignments, setAssignments] = useState<Array<{
    id: string;
    faculty: { name: string; employeeId: string };
    section: { name: string };
    subject: { name: string; code: string };
    isClassTeacher: boolean;
  }>>([]);

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetch(`/api/subjects?branchId=${selectedBranch}&semester=${semester}`)
        .then(r => r.json()).then(d => setSubjects(d.subjects || [])).catch(console.error);
      fetch(`/api/faculty?branchId=${selectedBranch}`)
        .then(r => r.json()).then(d => {
          setFaculty(d.faculty || []);
          // Collect existing assignments
          const allAssignments = (d.faculty || []).flatMap((f: { assignments: Array<{ id: string; section: { name: string }; subject: { name: string; code: string }; isClassTeacher: boolean }>; name: string; employeeId: string }) =>
            f.assignments.map((a: { id: string; section: { name: string }; subject: { name: string; code: string }; isClassTeacher: boolean }) => ({
              ...a,
              faculty: { name: f.name, employeeId: f.employeeId }
            }))
          );
          setAssignments(allAssignments);
        }).catch(console.error);
    }
  }, [selectedBranch, semester]);

  const selectedBranchData = branches.find(b => b.id === selectedBranch);
  const sections = selectedBranchData?.sections || [];

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFaculty || !selectedSection || !selectedSubject) {
      setMessage('All fields are required');
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          facultyId: selectedFaculty,
          sectionId: selectedSection,
          subjectId: selectedSubject,
          semester,
          academicYear,
          isClassTeacher,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Assignment created');
        // Refresh faculty data
        fetch(`/api/faculty?branchId=${selectedBranch}`)
          .then(r => r.json()).then(d => {
            setFaculty(d.faculty || []);
            const allAssignments = (d.faculty || []).flatMap((f: { assignments: Array<{ id: string; section: { name: string }; subject: { name: string; code: string }; isClassTeacher: boolean }>; name: string; employeeId: string }) =>
              f.assignments.map((a: { id: string; section: { name: string }; subject: { name: string; code: string }; isClassTeacher: boolean }) => ({
                ...a,
                faculty: { name: f.name, employeeId: f.employeeId }
              }))
            );
            setAssignments(allAssignments);
          });
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
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Faculty Assignments</h1>

      {/* New Assignment Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Assign Faculty to Section/Subject</h2>
        <form onSubmit={handleAssign}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
              <select value={selectedBranch} onChange={e => setSelectedBranch(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
                <option value="">Select</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.shortName} - {b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
              <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
                <option value="">Select</option>
                {sections.map(s => <option key={s.id} value={s.id}>Section {s.name} ({s.batchYear})</option>)}
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
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
              <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
                <option value="">Select</option>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Faculty</label>
              <select value={selectedFaculty} onChange={e => setSelectedFaculty(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
                <option value="">Select</option>
                {faculty.map(f => <option key={f.id} value={f.id}>{f.employeeId} - {f.name}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isClassTeacher} onChange={e => setIsClassTeacher(e.target.checked)}
                  className="w-4 h-4 rounded" />
                <span className="text-sm text-gray-700">Class Teacher</span>
              </label>
            </div>
          </div>

          {message && <p className="mb-3 text-sm">{message}</p>}

          <button type="submit" disabled={loading}
            className="bg-[#e5a100] hover:bg-[#d4940a] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50 text-sm">
            {loading ? 'Assigning...' : 'Create Assignment'}
          </button>
        </form>
      </div>

      {/* Current Assignments */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-[#1f4e5f] px-6 py-3">
          <h2 className="text-white font-semibold">Current Assignments ({assignments.length})</h2>
        </div>
        {assignments.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No assignments found. Select a branch to view.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Faculty</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Section</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Subject</th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-600">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {assignments.map(a => (
                <tr key={a.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{a.faculty.name} <span className="text-gray-400">({a.faculty.employeeId})</span></td>
                  <td className="px-4 py-2 text-sm">Section {a.section.name}</td>
                  <td className="px-4 py-2 text-sm">{a.subject.code} - {a.subject.name}</td>
                  <td className="px-4 py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.isClassTeacher ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {a.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
