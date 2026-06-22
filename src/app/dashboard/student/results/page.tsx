'use client';

import { useEffect, useState } from 'react';
import { Download, Eye, AlertTriangle } from 'lucide-react';

interface SubjectResult {
  subject: { name: string; code: string };
  internalMarks: number | null; externalMarks: number | null; totalMarks: number | null;
  grade: string | null; gradePoints: number | null; credits: number | null;
  isBacklog: boolean; backlogCleared: boolean;
}
interface SemesterResult {
  id: string; semester: number; academicYear: string; examSession: string | null; examType: string | null;
  sgpa: number | null; cgpa: number | null; totalCredits: number | null; earnedCredits: number | null;
  subjectResults: SubjectResult[];
}
interface Profile { name: string; registrationNo: string; branch: { shortName: string }; batchYear: number; }

export default function StudentResultsPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<SemesterResult[]>([]);
  const [backlogs, setBacklogs] = useState<SubjectResult[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedSem, setSelectedSem] = useState<number | ''>('');
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/results').then(r => r.json()),
    ]).then(([me, res]) => {
      setProfile(me.profile);
      setResults(res.results || []);
      setBacklogs(res.activeBacklogs || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // Derive available semesters (only those the student has reached)
  const maxSemester = results.length > 0 ? Math.max(...results.map(r => r.semester)) : 0;
  const availableSemesters = Array.from({ length: maxSemester }, (_, i) => i + 1);

  // Derive available exam sessions (from real data, most recent first)
  const examSessions = [...new Set(results.map(r => r.examSession).filter(Boolean) as string[])].sort((a, b) => {
    // Sort by date: parse "Mon-YYYY" format
    const months: Record<string, number> = { Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6, Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12 };
    const [mA, yA] = a.split('-');
    const [mB, yB] = b.split('-');
    const dateA = parseInt(yA) * 100 + (months[mA] || 0);
    const dateB = parseInt(yB) * 100 + (months[mB] || 0);
    return dateB - dateA; // Most recent first
  });

  // Find result matching both session and semester
  const currentResult = results.find(r =>
    (selectedSession ? r.examSession === selectedSession : true) &&
    (selectedSem ? r.semester === selectedSem : false)
  );

  const handleView = () => {
    if (currentResult) setShowResult(true);
  };

  const handleDownload = () => {
    if (!currentResult || !profile) return;
    // Generate downloadable result sheet
    let content = `╔══════════════════════════════════════════════════════════════════╗\n`;
    content += `║  JB INSTITUTE OF ENGINEERING & TECHNOLOGY (UGC Autonomous)     ║\n`;
    content += `║  SEMESTER EXAMINATION RESULTS                                  ║\n`;
    content += `╚══════════════════════════════════════════════════════════════════╝\n\n`;
    content += `H.T. No       : ${profile.registrationNo}\n`;
    content += `Student Name  : ${profile.name}\n`;
    content += `Branch        : ${profile.branch.shortName}\n`;
    content += `Semester      : ${currentResult.semester}\n`;
    content += `Exam Session  : ${currentResult.examSession || currentResult.academicYear}\n`;
    content += `Exam Type     : ${currentResult.examType || 'Regular'}\n\n`;
    content += `${'─'.repeat(90)}\n`;
    content += `${'Code'.padEnd(10)} ${'Subject Name'.padEnd(32)} ${'Int'.padEnd(5)} ${'Ext'.padEnd(5)} ${'Tot'.padEnd(5)} ${'Grade'.padEnd(7)} ${'GP'.padEnd(5)} ${'Cr'.padEnd(4)} Result\n`;
    content += `${'─'.repeat(90)}\n`;
    for (const sr of currentResult.subjectResults) {
      const result = sr.isBacklog && !sr.backlogCleared ? 'FAIL' : 'PASS';
      content += `${(sr.subject.code).padEnd(10)} ${(sr.subject.name).padEnd(32)} ${String(sr.internalMarks ?? '-').padEnd(5)} ${String(sr.externalMarks ?? '-').padEnd(5)} ${String(sr.totalMarks ?? '-').padEnd(5)} ${(sr.grade || '-').padEnd(7)} ${String(sr.gradePoints ?? '-').padEnd(5)} ${String(sr.credits ?? '-').padEnd(4)} ${result}\n`;
    }
    content += `${'─'.repeat(90)}\n\n`;
    content += `Total Credits : ${currentResult.totalCredits || '-'}\n`;
    content += `Credits Earned: ${currentResult.earnedCredits || '-'}\n`;
    content += `SGPA          : ${currentResult.sgpa?.toFixed(2) || '-'}\n`;
    content += `CGPA          : ${currentResult.cgpa?.toFixed(2) || '-'}\n\n`;
    content += `${'─'.repeat(90)}\n`;
    content += `Note: Any discrepancy should be reported to Controller of Examinations\n`;
    content += `      immediately at exam@jbiet.edu.in\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JBIET_Result_${profile.registrationNo}_Sem${currentResult.semester}_${currentResult.examSession || 'result'}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading...</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Sem Result</h1>

      {/* Lookup Form */}
      <div className="bg-card rounded-2xl border border-border p-4 sm:p-5 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Exammy (Exam Session)</label>
            <select value={selectedSession} onChange={e => { setSelectedSession(e.target.value); setShowResult(false); }}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none">
              <option value="">-- Select Session --</option>
              {examSessions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Semester</label>
            <select value={selectedSem} onChange={e => { setSelectedSem(e.target.value ? parseInt(e.target.value) : ''); setShowResult(false); }}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none">
              <option value="">-- Select Semester --</option>
              {availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">H.T. No</label>
            <input type="text" value={profile?.registrationNo || ''} readOnly
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface text-ink font-semibold cursor-not-allowed" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mt-4">
          <div>
            <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Roll Number</label>
            <input type="text" value={profile?.registrationNo || ''} readOnly
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface text-secondary cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Student Name</label>
            <input type="text" value={profile?.name || ''} readOnly
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface text-secondary cursor-not-allowed" />
          </div>
          <div className="flex items-end gap-2">
            {currentResult && (
              <>
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">SGPA</label>
                  <input type="text" value={currentResult.sgpa?.toFixed(2) || '—'} readOnly
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface font-bold text-blue cursor-not-allowed" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Credits</label>
                  <input type="text" value={`${currentResult.earnedCredits || 0}/${currentResult.totalCredits || 0}`} readOnly
                    className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface font-bold cursor-not-allowed" />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <button onClick={handleView} disabled={!currentResult}
            className="flex items-center gap-1.5 bg-blue hover:bg-blue-hover text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Eye size={14} /> View
          </button>
          <button onClick={handleDownload} disabled={!currentResult}
            className="flex items-center gap-1.5 bg-surface border border-border hover:bg-blue-light text-ink px-5 py-2.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <Download size={14} /> Download
          </button>
          {!currentResult && selectedSem && selectedSession && (
            <p className="text-xs text-muted">No result found for this session/semester combination.</p>
          )}
        </div>
      </div>

      {/* Full Result Table */}
      {showResult && currentResult && (
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-border bg-surface">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-ink">
                Semester {currentResult.semester} — {currentResult.examSession} ({currentResult.examType || 'Regular'})
              </h2>
              <div className="flex items-center gap-4 text-xs">
                <span><span className="text-secondary">SGPA:</span> <span className="font-bold text-blue">{currentResult.sgpa?.toFixed(2)}</span></span>
                <span><span className="text-secondary">CGPA:</span> <span className="font-bold text-orange">{currentResult.cgpa?.toFixed(2)}</span></span>
                <span><span className="text-secondary">Credits:</span> <span className="font-bold">{currentResult.earnedCredits}/{currentResult.totalCredits}</span></span>
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface border-b border-border">
                <tr>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase">Subject Code</th>
                  <th className="px-3 py-2.5 text-left text-[10px] font-semibold text-secondary uppercase">Subject Name</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-secondary uppercase">Internal</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-secondary uppercase">External</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-secondary uppercase">Total</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-secondary uppercase">Grade</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-secondary uppercase">Grade Points</th>
                  <th className="px-3 py-2.5 text-center text-[10px] font-semibold text-secondary uppercase">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {currentResult.subjectResults.map((sr, i) => (
                  <tr key={i} className={sr.isBacklog && !sr.backlogCleared ? 'bg-danger-light/30' : ''}>
                    <td className="px-3 py-2 font-mono text-xs">{sr.subject.code}</td>
                    <td className="px-3 py-2 text-ink">{sr.subject.name}</td>
                    <td className="px-3 py-2 text-center">{sr.internalMarks ?? '—'}</td>
                    <td className="px-3 py-2 text-center">{sr.externalMarks ?? '—'}</td>
                    <td className="px-3 py-2 text-center font-semibold">{sr.totalMarks ?? '—'}</td>
                    <td className="px-3 py-2 text-center font-bold">{sr.grade || '—'}</td>
                    <td className="px-3 py-2 text-center">{sr.gradePoints ?? '—'}</td>
                    <td className="px-3 py-2 text-center">
                      {sr.isBacklog && !sr.backlogCleared ? (
                        <span className="bg-danger text-white px-2 py-0.5 rounded text-[10px] font-bold">FAIL</span>
                      ) : (
                        <span className="bg-success-light text-success px-2 py-0.5 rounded text-[10px] font-bold">PASS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
        <AlertTriangle size={14} className="text-danger mt-0.5 flex-shrink-0" />
        <p className="text-xs text-danger font-medium">
          Note: Any discrepancy noted should be brought to the notice of Controller of Examinations immediately at{' '}
          <a href="mailto:exam@jbiet.edu.in" className="underline">exam@jbiet.edu.in</a>
        </p>
      </div>
    </div>
  );
}
