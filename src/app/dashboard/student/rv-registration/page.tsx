'use client';

import { useEffect, useState } from 'react';
import { RotateCcw, ChevronRight, ChevronLeft, AlertTriangle } from 'lucide-react';

interface Profile { name: string; registrationNo: string; mobileNo: string | null; }
interface UserInfo { email: string | null; }
interface SemesterResult { id: string; semester: number; examSession: string | null; subjectResults: SubjectResult[]; }
interface SubjectResult { subject: { id: string; name: string; code: string }; totalMarks: number | null; grade: string | null; }
interface ExamSession { id: string; name: string; sessionMonth: string; semester: number; rvDeadline: string | null; resultsPublished: boolean; }

export default function RVRegistrationPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [results, setResults] = useState<SemesterResult[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);

  const [selectedSession, setSelectedSession] = useState('');
  const [selectedSem, setSelectedSem] = useState<number | ''>('');
  const [rvType, setRvType] = useState<'REVALUATION' | 'RECOUNTING'>('REVALUATION');

  // Dual-box state
  const [availablePapers, setAvailablePapers] = useState<SubjectResult[]>([]);
  const [optedPapers, setOptedPapers] = useState<SubjectResult[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [rvWindowClosed, setRvWindowClosed] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/results').then(r => r.json()),
      fetch('/api/exam-sessions?active=false').then(r => r.json()).catch(() => ({ sessions: [] })),
    ]).then(([me, res, es]) => {
      setProfile(me.profile);
      setUserInfo(me.user);
      setResults(res.results || []);
      setExamSessions(es.sessions || []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  // When session + semester change, populate available papers
  useEffect(() => {
    setOptedPapers([]);
    setAvailablePapers([]);
    setRvWindowClosed(false);

    if (!selectedSession || !selectedSem) return;

    // Check RV deadline
    const session = examSessions.find(s => s.id === selectedSession);
    if (session?.rvDeadline && new Date() > new Date(session.rvDeadline)) {
      setRvWindowClosed(true);
      return;
    }

    // Find the semester result matching this session
    const semResult = results.find(r => r.semester === selectedSem);
    if (semResult && semResult.subjectResults.length > 0) {
      setAvailablePapers(semResult.subjectResults);
    }
  }, [selectedSession, selectedSem, results, examSessions]);

  const moveTo = (paper: SubjectResult) => {
    setAvailablePapers(prev => prev.filter(p => p.subject.id !== paper.subject.id));
    setOptedPapers(prev => [...prev, paper]);
  };

  const moveBack = (paper: SubjectResult) => {
    setOptedPapers(prev => prev.filter(p => p.subject.id !== paper.subject.id));
    setAvailablePapers(prev => [...prev, paper]);
  };

  // Fee per paper (flagged for confirmation)
  const feePerPaper = rvType === 'REVALUATION' ? 500 : 300;
  const totalFee = optedPapers.length * feePerPaper;

  const handleContinueToPayment = async () => {
    if (optedPapers.length === 0 || !selectedSession) return;
    setSubmitting(true);
    setMessage('');

    const semResult = results.find(r => r.semester === selectedSem);
    if (!semResult) { setMessage('No result found'); setSubmitting(false); return; }

    // Create RV requests for each opted paper
    let successCount = 0;
    for (const paper of optedPapers) {
      try {
        const res = await fetch('/api/revaluation', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            examSessionId: selectedSession,
            subjectId: paper.subject.id,
            semesterResultId: semResult.id,
            originalMarks: paper.totalMarks,
            originalGrade: paper.grade,
            rvType,
            feeAmount: feePerPaper,
          }),
        });
        if (res.ok) successCount++;
        else {
          const err = await res.json();
          if (err.error?.includes('already requested')) continue; // skip duplicates
        }
      } catch { /* continue with others */ }
    }

    if (successCount > 0) {
      setMessage(`✓ ${successCount} ${rvType.toLowerCase()} request(s) submitted. Total fee: ₹${totalFee}. Payment will be processed.`);
      setOptedPapers([]);
    } else {
      setMessage('RV requests may already exist for selected papers, or an error occurred.');
    }
    setSubmitting(false);
  };

  // Available semesters (only those with results)
  const availableSemesters = [...new Set(results.map(r => r.semester))].sort();
  // Sessions that have results published
  const sessionsWithResults = examSessions.filter(s => s.resultsPublished || results.some(r => r.examSession === s.sessionMonth));

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading...</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink flex items-center gap-2">
        <RotateCcw size={20} className="text-blue" /> RV Registration
      </h1>

      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        {/* Row 1: Exammy + Semester */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Exammy (Exam Session)</label>
            <select value={selectedSession} onChange={e => setSelectedSession(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none">
              <option value="">-- Select Session --</option>
              {sessionsWithResults.map(s => <option key={s.id} value={s.id}>{s.sessionMonth} — {s.name}</option>)}
              {/* Fallback: show sessions derived from results if no ExamSession entities match */}
              {sessionsWithResults.length === 0 && results.map(r => r.examSession).filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).map(s => (
                <option key={s} value={s!}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Semester</label>
            <select value={selectedSem} onChange={e => setSelectedSem(e.target.value ? parseInt(e.target.value) : '')}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none">
              <option value="">-- Select --</option>
              {availableSemesters.map(s => <option key={s} value={s}>Semester {s}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2: Email + Mobile (read-only) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Email</label>
            <input type="text" value={userInfo?.email || '—'} readOnly
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface text-secondary cursor-not-allowed" />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Mobile</label>
            <input type="text" value={profile?.mobileNo || '—'} readOnly
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm bg-surface text-secondary cursor-not-allowed" />
          </div>
        </div>

        {/* Row 3: RV Type radio */}
        <div className="mb-5">
          <label className="block text-[10px] font-semibold text-secondary uppercase mb-2">Type</label>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="rvType" value="REVALUATION" checked={rvType === 'REVALUATION'}
                onChange={() => setRvType('REVALUATION')} className="w-4 h-4 text-blue" />
              <span className="text-sm text-ink font-medium">Revaluation</span>
              <span className="text-[10px] text-muted">(₹{500}/paper)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="rvType" value="RECOUNTING" checked={rvType === 'RECOUNTING'}
                onChange={() => setRvType('RECOUNTING')} className="w-4 h-4 text-blue" />
              <span className="text-sm text-ink font-medium">Recounting</span>
              <span className="text-[10px] text-muted">(₹{300}/paper)</span>
            </label>
          </div>
        </div>

        {/* RV Window Closed Message */}
        {rvWindowClosed && (
          <div className="flex items-center gap-2 bg-danger-light border border-danger/20 rounded-xl px-4 py-3 mb-4">
            <AlertTriangle size={15} className="text-danger" />
            <p className="text-sm text-danger font-medium">RV registration window is closed for this exam session. The deadline has passed.</p>
          </div>
        )}

        {/* Dual List Box — Paper Selection */}
        {selectedSession && selectedSem && !rvWindowClosed && (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
              {/* Left: Available Papers */}
              <div className="p-4">
                <p className="text-xs font-bold text-secondary uppercase mb-2">RV Registered Paper(s)</p>
                {availablePapers.length === 0 && optedPapers.length === 0 ? (
                  <p className="text-xs text-muted italic py-4">No eligible papers found for this selection.</p>
                ) : availablePapers.length === 0 ? (
                  <p className="text-xs text-muted italic py-4">All papers moved to opted list.</p>
                ) : (
                  <div className="space-y-1.5">
                    {availablePapers.map(p => (
                      <button key={p.subject.id} onClick={() => moveTo(p)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-surface hover:bg-blue-light rounded-lg transition-colors text-left group">
                        <div>
                          <span className="text-xs font-mono text-secondary">{p.subject.code}</span>
                          <span className="text-xs text-ink ml-2">{p.subject.name}</span>
                          <span className="text-[10px] text-muted ml-2">(Marks: {p.totalMarks}, Grade: {p.grade})</span>
                        </div>
                        <ChevronRight size={14} className="text-muted group-hover:text-blue" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right: Opted Papers */}
              <div className="p-4 bg-blue-light/30">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-bold text-secondary uppercase">Opted Papers</p>
                  <span className="text-[10px] font-bold text-blue bg-blue-light px-2 py-0.5 rounded-full">
                    Total Paper(s): {optedPapers.length}
                  </span>
                </div>
                {optedPapers.length === 0 ? (
                  <p className="text-xs text-muted italic py-4">Click papers from the left to add them here.</p>
                ) : (
                  <div className="space-y-1.5">
                    {optedPapers.map(p => (
                      <button key={p.subject.id} onClick={() => moveBack(p)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-card border border-blue/20 hover:bg-danger-light rounded-lg transition-colors text-left group">
                        <div>
                          <span className="text-xs font-mono text-blue">{p.subject.code}</span>
                          <span className="text-xs text-ink ml-2 font-medium">{p.subject.name}</span>
                        </div>
                        <ChevronLeft size={14} className="text-muted group-hover:text-danger" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer: fee summary + button */}
            <div className="border-t border-border px-4 py-3 bg-surface flex items-center justify-between">
              <div className="text-xs text-secondary">
                {optedPapers.length > 0 && (
                  <span>{optedPapers.length} paper(s) × ₹{feePerPaper} = <span className="font-bold text-ink">₹{totalFee}</span></span>
                )}
              </div>
              <button onClick={handleContinueToPayment}
                disabled={optedPapers.length === 0 || submitting}
                className="bg-blue hover:bg-blue-hover text-white px-5 py-2 rounded-xl text-xs font-semibold shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                {submitting ? 'Processing...' : 'Continue to Payment'}
              </button>
            </div>
          </div>
        )}

        {message && (
          <div className={`mt-4 px-4 py-3 rounded-xl text-sm font-medium ${message.startsWith('✓') ? 'bg-success-light text-success' : 'bg-orange-light text-orange'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
