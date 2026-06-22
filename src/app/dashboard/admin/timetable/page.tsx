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

interface Slot {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subjectId: string;
  facultyName: string;
  room: string;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_SLOTS = [
  { start: '09:00', end: '10:00' },
  { start: '10:00', end: '11:00' },
  { start: '11:15', end: '12:15' },
  { start: '12:15', end: '13:15' },
  { start: '14:00', end: '15:00' },
  { start: '15:00', end: '16:00' },
];

export default function AdminTimetablePage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [semester, setSemester] = useState(3);
  const [academicYear, setAcademicYear] = useState('2024-2025');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])).catch(console.error);
  }, []);

  useEffect(() => {
    if (selectedBranch) {
      fetch(`/api/subjects?branchId=${selectedBranch}&semester=${semester}`)
        .then(r => r.json())
        .then(d => setSubjects(d.subjects || []))
        .catch(console.error);
    }
  }, [selectedBranch, semester]);

  const selectedBranchData = branches.find(b => b.id === selectedBranch);
  const sections = selectedBranchData?.sections || [];

  const addSlot = () => {
    setSlots(prev => [...prev, { dayOfWeek: 0, startTime: '09:00', endTime: '10:00', subjectId: '', facultyName: '', room: '' }]);
  };

  const updateSlot = (index: number, field: keyof Slot, value: string | number) => {
    setSlots(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const removeSlot = (index: number) => {
    setSlots(prev => prev.filter((_, i) => i !== index));
  };

  const autoFill = () => {
    // Auto-generate a basic timetable
    const newSlots: Slot[] = [];
    for (let day = 0; day < 6; day++) {
      for (let period = 0; period < TIME_SLOTS.length; period++) {
        const subIdx = (day * TIME_SLOTS.length + period) % subjects.length;
        if (subjects[subIdx]) {
          newSlots.push({
            dayOfWeek: day,
            startTime: TIME_SLOTS[period].start,
            endTime: TIME_SLOTS[period].end,
            subjectId: subjects[subIdx].id,
            facultyName: '',
            room: `Room ${101 + (period % 5)}`,
          });
        }
      }
    }
    setSlots(newSlots);
  };

  const handleSubmit = async () => {
    if (!selectedBranch || !selectedSection) {
      setMessage('Please select branch and section');
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/timetable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          branchId: selectedBranch,
          sectionId: selectedSection,
          semester,
          academicYear,
          slots: slots.filter(s => s.subjectId),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Timetable saved successfully');
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
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Manage Timetable</h1>

      {/* Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
        </div>
      </div>

      {/* Slots Editor */}
      {selectedSection && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">Time Slots ({slots.length})</h2>
            <div className="flex gap-2">
              {subjects.length > 0 && (
                <button onClick={autoFill} className="bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg text-sm hover:bg-blue-200">
                  Auto-Fill
                </button>
              )}
              <button onClick={addSlot} className="bg-green-100 text-green-700 px-3 py-1.5 rounded-lg text-sm hover:bg-green-200">
                + Add Slot
              </button>
            </div>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {slots.map((slot, i) => (
              <div key={i} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                <select value={slot.dayOfWeek} onChange={e => updateSlot(i, 'dayOfWeek', parseInt(e.target.value))}
                  className="px-2 py-1 border rounded text-sm w-28">
                  {DAYS.map((d, idx) => <option key={idx} value={idx}>{d}</option>)}
                </select>
                <input type="time" value={slot.startTime} onChange={e => updateSlot(i, 'startTime', e.target.value)}
                  className="px-2 py-1 border rounded text-sm w-24" />
                <input type="time" value={slot.endTime} onChange={e => updateSlot(i, 'endTime', e.target.value)}
                  className="px-2 py-1 border rounded text-sm w-24" />
                <select value={slot.subjectId} onChange={e => updateSlot(i, 'subjectId', e.target.value)}
                  className="px-2 py-1 border rounded text-sm flex-1">
                  <option value="">Select Subject</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.code} - {s.name}</option>)}
                </select>
                <input type="text" placeholder="Faculty" value={slot.facultyName} onChange={e => updateSlot(i, 'facultyName', e.target.value)}
                  className="px-2 py-1 border rounded text-sm w-32" />
                <input type="text" placeholder="Room" value={slot.room} onChange={e => updateSlot(i, 'room', e.target.value)}
                  className="px-2 py-1 border rounded text-sm w-20" />
                <button onClick={() => removeSlot(i)} className="text-red-500 hover:text-red-700 text-sm px-2">✕</button>
              </div>
            ))}
          </div>

          {message && <p className="mt-4 text-sm">{message}</p>}

          <button onClick={handleSubmit} disabled={loading || slots.length === 0}
            className="mt-4 bg-[#e5a100] hover:bg-[#d4940a] text-white px-6 py-2.5 rounded-lg font-medium disabled:opacity-50">
            {loading ? 'Saving...' : 'Save Timetable'}
          </button>
        </div>
      )}
    </div>
  );
}
