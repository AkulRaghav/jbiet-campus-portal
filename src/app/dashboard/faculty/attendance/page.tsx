'use client';

import { useEffect, useState } from 'react';
import { Users, CheckCircle, XCircle, AlertTriangle, Save, Search } from 'lucide-react';

interface Assignment { id: string; sectionId: string; subjectId: string; section: { id: string; name: string }; subject: { id: string; name: string; code: string }; }
interface Student { id: string; registrationNo: string; name: string; }

export default function FacultyAttendancePage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, 'PRESENT' | 'ABSENT'>>({});
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Section-level aggregated stats
  const [sectionStats, setSectionStats] = useState<Record<string, { total: number; present: number; absent: number; pct: number; belowThreshold: number }>>({});

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.profile?.assignments) {
        setAssignments(data.profile.assignments);
        // Compute section-level stats from all assignments
        computeSectionStats(data.profile.assignments);
      }
    }).catch(console.error);
  }, []);

  const computeSectionStats = async (assigns: Assignment[]) => {
    // For each unique section, get aggregate attendance
    const uniqueSections = [...new Map(assigns.map(a => [a.sectionId, a])).values()];
    const stats: typeof sectionStats = {};
    for (const a of uniqueSections) {
      try {
        const res = await fetch(`/api/attendance?sectionId=${a.sectionId}`);
        const data = await res.json();
        const records = data.records || [];
        const present = records.filter((r: { status: string }) => r.status === 'PRESENT').length;
        const total = records.length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;

        // Count students below 75%
        const studentMap: Record<string, { present: number; total: number }> = {};
        for (const r of records) {
          if (!studentMap[r.student?.id || '']) studentMap[r.student?.id || ''] = { present: 0, total: 0 };
          studentMap[r.student?.id || ''].total++;
          if (r.status === 'PRESENT') studentMap[r.student?.id || ''].present++;
        }
        const below = Object.values(studentMap).filter(s => s.total > 0 && (s.present / s.total) < 0.75).length;

        stats[a.sectionId] = { total, present, absent: total - present, pct, belowThreshold: below };
      } catch { /* continue */ }
    }
    setSectionStats(stats);
  };

  const loadStudents = async (assignment: Assignment) => {
    setSelectedAssignment(assignment);
    setMessage('');
    const res = await fetch(`/api/students?sectionId=${assignment.sectionId}&limit=100`);
    const data = await res.json();
    const studs = data.students || [];
    setStudents(studs);
    const initial: Record<string, 'PRESENT' | 'ABSENT'> = {};
    studs.forEach((s: Student) => { initial[s.id] = 'PRESENT'; });
    setAttendance(initial);
  };

  const toggleAttendance = (studentId: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: prev[studentId] === 'PRESENT' ? 'ABSENT' : 'PRESENT' }));
  };

  const markAll = (status: 'PRESENT' | 'ABSENT') => {
    const updated: Record<string, 'PRESENT' | 'ABSENT'> = {};
    students.forEach(s => { updated[s.id] = status; });
    setAttendance(updated);
  };

  const submitAttendance = async () => {
    if (!selectedAssignment) return;
    setLoading(true); setMessage('');
    const records = Object.entries(attendance).map(([studentId, status]) => ({ studentId, status }));
    try {
      const res = await fetch('/api/attendance', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sectionId: selectedAssignment.sectionId, subjectId: selectedAssignment.subjectId, date, records }),
      });
      const data = await res.json();
      if (res.ok) setMessage(`✓ Attendance saved for ${data.count} students`);
      else setMessage(`✗ ${data.error}`);
    } catch { setMessage('✗ Network error'); }
    finally { setLoading(false); }
  };

  const presentCount = Object.values(attendance).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(attendance).filter(s => s === 'ABSENT').length;

  const filteredStudents = searchQuery
    ? students.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.registrationNo.includes(searchQuery))
    : students;

  // Unique sections for summary cards
  const uniqueSections = [...new Map(assignments.map(a => [a.sectionId, a])).values()];

  return (
    <div className="space-y-5">
      {/* Header with date */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl font-bold text-ink">Attendance Dashboard</h1>
        <div className="flex items-center gap-3">
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none" />
        </div>
      </div>

      {/* 3-column layout matching reference */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left column: Section selection + section summary cards */}
        <div className="lg:col-span-3 space-y-3">
          <p className="text-xs font-bold text-secondary uppercase">My Sections</p>
          {uniqueSections.map(a => {
            const stats = sectionStats[a.sectionId];
            const isSelected = selectedAssignment?.sectionId === a.sectionId;
            return (
              <button key={a.sectionId} onClick={() => loadStudents(a)}
                className={`w-full text-left rounded-xl border p-3 transition-all ${isSelected ? 'border-blue bg-blue-light shadow-sm' : 'border-border bg-card hover:border-blue/30'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">Section {a.section.name}</p>
                    <p className="text-[10px] text-muted">{a.subject.code} — {a.subject.name}</p>
                  </div>
                  {stats && <span className={`stat-number text-lg ${stats.pct >= 75 ? '' : 'text-danger'}`}>{stats.pct}%</span>}
                </div>
                {stats && (
                  <div className="flex items-center gap-3 mt-2 text-[10px] text-muted">
                    <span className="text-success">P: {stats.present}</span>
                    <span className="text-danger">A: {stats.absent}</span>
                    {stats.belowThreshold > 0 && (
                      <span className="text-danger font-bold flex items-center gap-0.5"><AlertTriangle size={9} /> {stats.belowThreshold} at risk</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
          {assignments.length === 0 && <p className="text-xs text-muted">No sections assigned. Contact admin.</p>}
        </div>

        {/* Center column: Roster panel with edit */}
        <div className="lg:col-span-6">
          {!selectedAssignment ? (
            <div className="bg-card rounded-2xl border border-border p-10 text-center shadow-sm h-full flex items-center justify-center">
              <div>
                <Users size={32} className="text-muted mx-auto mb-2" />
                <p className="text-sm text-muted">Select a section to mark attendance</p>
              </div>
            </div>
          ) : (
            <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              {/* Roster header */}
              <div className="px-4 py-3 border-b border-border bg-surface flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="text-sm font-bold text-ink">Section {selectedAssignment.section.name} — {selectedAssignment.subject.code}</p>
                  <p className="text-[10px] text-muted">{date} · {students.length} students</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => markAll('PRESENT')} className="text-[10px] bg-success-light text-success px-2.5 py-1 rounded-lg font-semibold">All Present</button>
                  <button onClick={() => markAll('ABSENT')} className="text-[10px] bg-danger-light text-danger px-2.5 py-1 rounded-lg font-semibold">All Absent</button>
                </div>
              </div>

              {/* Search */}
              <div className="px-4 py-2 border-b border-border">
                <div className="relative">
                  <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
                  <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    placeholder="Search student..." className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs focus:ring-1 focus:ring-blue/20 outline-none" />
                </div>
              </div>

              {/* Student list */}
              <div className="max-h-[420px] overflow-y-auto divide-y divide-border">
                {filteredStudents.map((s, i) => (
                  <div key={s.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-surface/50">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-light flex items-center justify-center text-blue font-bold text-[10px]">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-ink">{s.name}</p>
                        <p className="text-[10px] text-muted">{s.registrationNo}</p>
                      </div>
                    </div>
                    <button onClick={() => toggleAttendance(s.id)}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                        attendance[s.id] === 'PRESENT' ? 'bg-success-light text-success' : 'bg-danger-light text-danger'
                      }`}>
                      {attendance[s.id] === 'PRESENT' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                      {attendance[s.id]}
                    </button>
                  </div>
                ))}
              </div>

              {/* Footer: summary + save */}
              <div className="px-4 py-3 border-t border-border bg-surface flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-success font-bold">Present: {presentCount}</span>
                  <span className="text-danger font-bold">Absent: {absentCount}</span>
                </div>
                <div className="flex items-center gap-2">
                  {message && <span className="text-[10px] text-blue">{message}</span>}
                  <button onClick={submitAttendance} disabled={loading}
                    className="flex items-center gap-1.5 bg-blue hover:bg-blue-hover text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm disabled:opacity-50">
                    <Save size={13} /> {loading ? 'Saving...' : 'Save Attendance'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right column: Today's summary stats */}
        <div className="lg:col-span-3 space-y-3">
          {selectedAssignment && students.length > 0 && (
            <>
              <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-ink">{students.length}</p>
                <p className="text-[10px] text-muted uppercase">Total Students</p>
              </div>
              <div className="bg-success-light rounded-xl border border-success/20 p-4 text-center">
                <p className="text-3xl font-bold text-success">{presentCount}</p>
                <p className="text-[10px] text-success uppercase">Present</p>
              </div>
              <div className="bg-danger-light rounded-xl border border-danger/20 p-4 text-center">
                <p className="text-3xl font-bold text-danger">{absentCount}</p>
                <p className="text-[10px] text-danger uppercase">Absent</p>
              </div>
              <div className="bg-card rounded-xl border border-border p-4 shadow-sm text-center">
                <p className="text-3xl font-bold text-blue">{students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%</p>
                <p className="text-[10px] text-muted uppercase">Today&apos;s Rate</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
