'use client';

import { useEffect, useState } from 'react';

interface Student {
  id: string;
  registrationNo: string;
  name: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  credits: number;
}

interface Branch {
  id: string;
  name: string;
  shortName: string;
  sections: { id: string; name: string; batchYear: number }[];
}

export default function AdminResultsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [semester, setSemester] = useState(3);
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [sgpa, setSgpa] = useState('');
  const [cgpa, setCgpa] = useState('');
  const [subjectMarks, setSubjectMarks] = useState<Record<string, { internal: string; external: string; grade: string; isBacklog: boolean }>>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedSection) {
      fetch(`/api/students?sectionId=${selectedSection}&limit=100`)
        .then(r => r.json())
        .then(d => setStudents(d.students || []))
        .catch(console.error);
    }
  }, [selectedSection]);

  useEffect(() => {
    if (selectedBranch) {
      // Fetch subjects for this branch and semester
      // Using the branch's subjects from the subjects table
      fetch(`/api/subjects?branchId=${selectedBranch}&semester=${semester}`)
        .then(r => r.json())
        .then(d => {
          const subs = d.subjects || [];
          setSubjects(subs);
          const initial: Record<string, { internal: string; external: string; grade: string; isBacklog: boolean }> = {};
          subs.forEach((s: Subject) => {
            initial[s.id] = { internal: '', external: '', grade: '', isBacklog: false };
          });
          setSubjectMarks(initial);
        })
        .catch(console.error);
    }
  }, [selectedBranch, semester]);

  const selectedBranchData = branches.find(b => b.id === selectedBranch);
  const sections = selectedBranchData?.sections || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent) {
      setMessage('Please select a student');
      return;
    }
    setLoading(true);
    setMessage('');

    const subjectsData = Object.entries(subjectMarks)
      .filter(([, v]) => v.internal || v.external)
      .map(([subjectId, marks]) => ({
        subjectId,
        internalMarks: marks.internal ? parseFloat(marks.internal) : null,
        externalMarks: marks.external ? parseFloat(marks.external) : null,
        totalMarks: (parseFloat(marks.internal || '0') + parseFloat(marks.external || '0')) || null,
        grade: marks.grade || null,
        gradePoints: marks.grade === 'O' ? 10 : marks.grade === 'A+' ? 10 : marks.grade === 'A' ? 9 : marks.grade === 'B+' ? 8 : marks.grade === 'B' ? 7 : marks.grade === 'C' ? 6 : marks.grade === 'D' ? 5 : 0,
        credits: subjects.find(s => s.id === subjectId)?.credits || 3,
        isBacklog: marks.isBacklog,
      }));

    try {
      const res = await fetch('/api/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent,
          semester,
          academicYear,
          sgpa: sgpa ? parseFloat(sgpa) : null,
          cgpa: cgpa ? parseFloat(cgpa) : null,
          totalCredits: subjectsData.reduce((s, sub) => s + (sub.credits || 0), 0),
          earnedCredits: subjectsData.filter(s => !s.isBacklog).reduce((s, sub) => s + (sub.credits || 0), 0),
          subjects: subjectsData,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Results saved successfully');
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
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Manage Results</h1>

      {/* Selection Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Select Student</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
            <select value={selectedBranch} onChange={e => { setSelectedBranch(e.target.value); setSelectedSection(''); }}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
              <option value="">Select</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.shortName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
            <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
              <option value="">Select</option>
              {sections.map(s => <option key={s.id} value={s.id}>{s.name} ({s.batchYear})</option>)}
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
            <label className="block text-xs font-medium text-gray-600 mb-1">Student</label>
            <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
              <option value="">Select Student</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.registrationNo} - {s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Results Entry Form */}
      {selectedStudent && subjects.length > 0 && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Enter Subject Results</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">Subject</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">Internal (30)</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">External (70)</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">Grade</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-gray-600">Backlog?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subjects.map(sub => (
                  <tr key={sub.id}>
                    <td className="px-3 py-2 text-sm">
                      <span className="font-medium">{sub.code}</span> - {sub.name}
                      <span className="text-gray-400 text-xs ml-1">({sub.credits} cr)</span>
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" max="30"
                        value={subjectMarks[sub.id]?.internal || ''}
                        onChange={e => setSubjectMarks(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], internal: e.target.value } }))}
                        className="w-16 px-2 py-1 border rounded text-sm text-center" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" min="0" max="70"
                        value={subjectMarks[sub.id]?.external || ''}
                        onChange={e => setSubjectMarks(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], external: e.target.value } }))}
                        className="w-16 px-2 py-1 border rounded text-sm text-center" />
                    </td>
                    <td className="px-3 py-2">
                      <select
                        value={subjectMarks[sub.id]?.grade || ''}
                        onChange={e => setSubjectMarks(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], grade: e.target.value } }))}
                        className="w-16 px-2 py-1 border rounded text-sm">
                        <option value="">-</option>
                        <option>O</option><option>A+</option><option>A</option>
                        <option>B+</option><option>B</option><option>C</option>
                        <option>D</option><option>F</option>
                      </select>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <input type="checkbox"
                        checked={subjectMarks[sub.id]?.isBacklog || false}
                        onChange={e => setSubjectMarks(prev => ({ ...prev, [sub.id]: { ...prev[sub.id], isBacklog: e.target.checked } }))}
                        className="w-4 h-4 rounded" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4 max-w-md">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SGPA</label>
              <input type="number" step="0.01" min="0" max="10" value={sgpa} onChange={e => setSgpa(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 8.5" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">CGPA</label>
              <input type="number" step="0.01" min="0" max="10" value={cgpa} onChange={e => setCgpa(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. 8.2" />
            </div>
          </div>

          {message && <p className="mt-4 text-sm">{message}</p>}

          <button type="submit" disabled={loading}
            className="mt-4 bg-[#e5a100] hover:bg-[#d4940a] text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Results'}
          </button>
        </form>
      )}
    </div>
  );
}
