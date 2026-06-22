'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock, UsersRound, FileText, MessageCircle, User, TrendingUp, TrendingDown, Minus, CheckCircle, Bell, BookOpen, CreditCard, Ticket, RotateCcw, Info } from 'lucide-react';

interface Profile { name: string; registrationNo: string; branch: { name: string; shortName: string }; section: { name: string }; batchYear: number; }
interface SemesterResult { semester: number; academicYear: string; sgpa: number | null; cgpa: number | null; totalCredits: number | null; earnedCredits: number | null; subjectResults: SubjectResult[]; }
interface SubjectResult { subject: { name: string; code: string }; grade: string | null; credits: number | null; isBacklog: boolean; backlogCleared: boolean; }
interface Notice { id: string; title: string; fileUrl: string | null; isNew: boolean; publishedAt: string; }
interface FeeRecord { category: string; totalAmount: number; paidAmount: number; scholarshipAmount: number; status: string; }
interface ExamSession { id: string; name: string; sessionMonth: string; isOpen: boolean; isClosed: boolean; registered: boolean; registrationClose: string; registration: { examFeePaid: boolean } | null; }

function sgpaColor(sgpa: number | null): string {
  if (!sgpa) return 'text-muted';
  if (sgpa >= 8.5) return 'text-success';
  if (sgpa >= 7.0) return 'text-ink';
  return 'text-orange';
}

function cgpaTrend(current: number | null, previous: number | null): { icon: React.ReactNode; color: string } {
  if (!current || !previous) return { icon: <Minus size={12} />, color: 'text-muted' };
  const diff = current - previous;
  if (diff > 0.05) return { icon: <TrendingUp size={12} />, color: 'text-success' };
  if (diff < -0.05) return { icon: <TrendingDown size={12} />, color: 'text-danger' };
  return { icon: <Minus size={12} />, color: 'text-muted' };
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [results, setResults] = useState<SemesterResult[]>([]);
  const [backlogs, setBacklogs] = useState<{ semester: number; subject: { name: string; code: string }; grade: string | null; credits: number | null }[]>([]);
  const [notices, setNotices] = useState<Notice[]>([]);
  const [fees, setFees] = useState<FeeRecord[]>([]);
  const [examSessions, setExamSessions] = useState<ExamSession[]>([]);
  const [expandedDeficit, setExpandedDeficit] = useState<number | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/results').then(r => r.json()),
      fetch('/api/notices?limit=8').then(r => r.json()),
      fetch('/api/fees').then(r => r.json()),
      fetch('/api/exam-sessions').then(r => r.json()).catch(() => ({ sessions: [] })),
    ]).then(([me, res, not, fee, es]) => {
      setProfile(me.profile);
      setResults(res.results || []);
      const bl: typeof backlogs = [];
      for (const sem of (res.results || [])) {
        for (const sr of sem.subjectResults) {
          if (sr.isBacklog && !sr.backlogCleared) {
            bl.push({ semester: sem.semester, subject: sr.subject, grade: sr.grade, credits: sr.credits });
          }
        }
      }
      setBacklogs(bl);
      setNotices(not.notices || []);
      setFees(fee.feeRecords || []);
      setExamSessions(es.sessions || []);
    }).catch(console.error);
  }, []);

  const latestSem = results.length > 0 ? results[results.length - 1].semester : 0;
  const latestCgpa = results.length > 0 ? results[results.length - 1].cgpa : null;
  const examNotices = notices.filter(n => n.title.toLowerCase().includes('exam') || n.title.toLowerCase().includes('time table') || n.title.toLowerCase().includes('hall ticket'));
  const resultNotices = notices.filter(n => n.title.toLowerCase().includes('result'));

  // "Needs Attention" items
  const totalFeeDue = fees.reduce((s, f) => s + Math.max(0, f.totalAmount - f.paidAmount - f.scholarshipAmount), 0);
  const unpaidCategories = fees.filter(f => f.status !== 'PAID').map(f => f.category);
  const openExamSessions = examSessions.filter(es => es.isOpen && !es.registered);
  const tuitionDue = fees.filter(f => (f.category === 'TUITION' || f.category === 'BUS') && f.status !== 'PAID').reduce((s, f) => s + Math.max(0, f.totalAmount - f.paidAmount - f.scholarshipAmount), 0);

  const attentionItems: { label: string; href: string; color: string; icon: React.ReactNode }[] = [];
  if (totalFeeDue > 0) attentionItems.push({ label: `₹${totalFeeDue.toLocaleString()} fee pending (${unpaidCategories.join(', ')})`, href: '/dashboard/student/fees', color: 'bg-danger-light text-danger border-danger/20', icon: <CreditCard size={13} /> });
  if (openExamSessions.length > 0) {
    const closingSession = openExamSessions[0];
    const daysLeft = Math.max(0, Math.ceil((new Date(closingSession.registrationClose).getTime() - Date.now()) / 86400000));
    attentionItems.push({ label: `Exam registration open — ${daysLeft} days left`, href: '/dashboard/student/exam-registration', color: 'bg-orange-light text-orange border-orange/20', icon: <BookOpen size={13} /> });
  }
  if (tuitionDue > 0 && examSessions.some(es => es.registered && es.registration?.examFeePaid)) {
    attentionItems.push({ label: 'Hall ticket requires in-person collection (fees due)', href: '/dashboard/student/hall-ticket', color: 'bg-orange-light text-orange border-orange/20', icon: <Ticket size={13} /> });
  }
  if (backlogs.length > 0) attentionItems.push({ label: `${backlogs.length} active backlog${backlogs.length > 1 ? 's' : ''} — check supplementary schedule`, href: '#backlogs', color: 'bg-danger-light text-danger border-danger/20', icon: <AlertTriangle size={13} /> });

  // Compute deficit explanation per semester
  function getDeficitExplanation(sem: SemesterResult): string {
    const failedSubjects = sem.subjectResults.filter(sr => sr.isBacklog && !sr.backlogCleared);
    if (failedSubjects.length === 0) return 'Credits pending — check with exam branch.';
    const totalMissing = failedSubjects.reduce((s, sr) => s + (sr.credits || 0), 0);
    return `${totalMissing} credits short — ${failedSubjects.length} subject${failedSubjects.length > 1 ? 's' : ''} failed: ${failedSubjects.map(s => s.subject.code).join(', ')}. See backlog section below.`;
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold text-ink">
            <span className="text-blue">{profile?.name || '—'}</span>
            <span className="text-secondary text-sm font-normal ml-2">({profile?.branch?.shortName || '—'})</span>
          </h1>
          <p className="text-xs text-muted mt-0.5">{profile?.registrationNo} · Section {profile?.section?.name} · Batch {profile?.batchYear}</p>
        </div>
        {latestCgpa && (
          <div className="bg-card border border-border rounded-xl px-4 py-2 shadow-sm">
            <p className="text-[10px] text-secondary uppercase">Current CGPA</p>
            <p className="text-xl font-bold text-blue">{latestCgpa.toFixed(2)}</p>
          </div>
        )}
      </div>

      {/* === "Needs Your Attention" Summary Strip === */}
      {attentionItems.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {attentionItems.map((item, i) => (
            <Link key={i} href={item.href}>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border cursor-pointer hover:shadow-sm transition-shadow ${item.color}`}>
                {item.icon}
                <span>{item.label}</span>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-success-light border border-success/20 rounded-xl px-4 py-2.5">
          <CheckCircle size={14} className="text-success" />
          <span className="text-xs font-semibold text-success">You&apos;re all caught up — no pending actions right now.</span>
        </div>
      )}

      {/* Examination Notifications */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Bell size={15} className="text-orange" />
          <h2 className="text-sm font-bold text-ink">Examination Notifications</h2>
        </div>
        {examNotices.length === 0 ? (
          <p className="text-xs text-muted italic pl-6">No examination notifications at this time.</p>
        ) : (
          <div className="space-y-2 pl-6">
            {examNotices.map(n => (
              <div key={n.id} className="flex items-center gap-2 text-sm">
                {n.isNew && <span className="bg-orange text-white text-[9px] px-1.5 py-[1px] rounded font-bold">NEW</span>}
                {n.fileUrl ? (
                  <a href={n.fileUrl} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-blue transition-colors">{n.title}</a>
                ) : (
                  <span className="text-ink">{n.title}</span>
                )}
                <span className="text-muted text-[10px] ml-auto">{new Date(n.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SGPA & CGPA Details Table */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-bold text-ink">SGPA & CGPA Details</h2>
          {results.length > 2 && (
            <div className="flex items-center gap-1 text-[10px] text-muted">
              {results.map((r, i) => (
                <div key={i} className="flex flex-col items-center" title={`Sem ${r.semester}: ${r.cgpa?.toFixed(2)}`}>
                  <div className="w-1.5 bg-blue rounded-full" style={{ height: `${(r.cgpa || 0) * 2.5}px`, minHeight: '4px', opacity: i === results.length - 1 ? 1 : 0.4 }} />
                </div>
              ))}
              <span className="ml-1 text-blue font-semibold">trend</span>
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-surface">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-semibold text-secondary">Semester</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-secondary">SGPA</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-secondary">CGPA</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-secondary">Trend</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-secondary">Total Credits</th>
                <th className="px-4 py-2.5 text-center text-xs font-semibold text-secondary">Credits Secured</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {results.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-muted text-xs">No results published yet.</td></tr>
              ) : (
                results.map((sem, idx) => {
                  const isLatest = sem.semester === latestSem;
                  const prevCgpa = idx > 0 ? results[idx - 1].cgpa : null;
                  const trend = cgpaTrend(sem.cgpa, prevCgpa);
                  const creditsDiff = (sem.totalCredits || 0) - (sem.earnedCredits || 0);
                  const deficitExpanded = expandedDeficit === sem.semester;

                  return (
                    <tr key={sem.semester} className={isLatest ? 'bg-blue-light/40' : 'hover:bg-surface/50'}>
                      <td className="px-4 py-2.5 font-medium text-ink">
                        Semester {sem.semester}
                        {isLatest && <span className="ml-2 text-[9px] bg-blue text-white px-1.5 py-[1px] rounded font-bold">LATEST</span>}
                      </td>
                      <td className={`px-4 py-2.5 text-center font-bold ${sgpaColor(sem.sgpa)}`}>{sem.sgpa?.toFixed(2) || '—'}</td>
                      <td className="px-4 py-2.5 text-center font-bold text-ink">{sem.cgpa?.toFixed(2) || '—'}</td>
                      <td className="px-4 py-2.5 text-center"><span className={`inline-flex items-center ${trend.color}`}>{trend.icon}</span></td>
                      <td className="px-4 py-2.5 text-center text-ink">{sem.totalCredits || '—'}</td>
                      <td className="px-4 py-2.5 text-center">
                        <span className={`font-medium ${creditsDiff > 0 ? 'text-danger' : 'text-ink'}`}>{sem.earnedCredits || '—'}</span>
                        {creditsDiff > 0 && (
                          <button
                            onClick={() => setExpandedDeficit(deficitExpanded ? null : sem.semester)}
                            className="inline-flex items-center gap-0.5 ml-1 text-[9px] text-danger bg-danger-light px-1.5 py-0.5 rounded-full cursor-pointer hover:bg-danger/10 transition-colors"
                            title="Click to see why"
                          >
                            (-{creditsDiff}) <Info size={9} />
                          </button>
                        )}
                        {deficitExpanded && creditsDiff > 0 && (
                          <div className="mt-1.5 text-left bg-danger-light rounded-lg p-2 text-[10px] text-danger">
                            {getDeficitExplanation(sem)}
                            <a href="#backlogs" className="block mt-1 text-blue underline text-[10px]">↓ View in backlogs section</a>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Result Notifications */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen size={15} className="text-blue" />
          <h2 className="text-sm font-bold text-ink">Result Notifications</h2>
        </div>
        {resultNotices.length === 0 ? (
          <p className="text-xs text-muted italic pl-6">No result notifications at this time.</p>
        ) : (
          <div className="space-y-2 pl-6">
            {resultNotices.map(n => (
              <div key={n.id} className="flex items-center gap-2 text-sm">
                {n.isNew && <span className="bg-blue text-white text-[9px] px-1.5 py-[1px] rounded font-bold">NEW</span>}
                {n.fileUrl ? (
                  <a href={n.fileUrl} target="_blank" rel="noopener noreferrer" className="text-ink hover:text-blue transition-colors">{n.title}</a>
                ) : (
                  <span className="text-ink">{n.title}</span>
                )}
                <span className="text-muted text-[10px] ml-auto">{new Date(n.publishedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Semester Wise Backlogs */}
      <div id="backlogs" className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <h2 className="text-sm font-bold text-ink">Semester Wise Backlogs Details</h2>
        </div>
        <div className="p-4">
          {results.length === 0 ? (
            <p className="text-xs text-muted px-2">No data available.</p>
          ) : (
            <div className="space-y-2">
              {results.map(sem => {
                const semBacklogs = backlogs.filter(b => b.semester === sem.semester);
                const hasBacklogs = semBacklogs.length > 0;
                return (
                  <div key={sem.semester} className={`rounded-xl overflow-hidden ${hasBacklogs ? 'border border-danger/20' : ''}`}>
                    <div className={`px-4 py-2 flex items-center gap-2 ${hasBacklogs ? 'bg-danger-light' : 'bg-success-light/50'}`}>
                      {hasBacklogs ? <AlertTriangle size={12} className="text-danger" /> : <CheckCircle size={12} className="text-success" />}
                      <span className={`text-xs font-bold ${hasBacklogs ? 'text-danger' : 'text-success'}`}>Semester {sem.semester}</span>
                      {!hasBacklogs && <span className="text-[10px] text-success/70 ml-1">All Clear</span>}
                      {hasBacklogs && <span className="text-[10px] text-danger/70 ml-1">{semBacklogs.length} subject{semBacklogs.length > 1 ? 's' : ''}</span>}
                    </div>
                    {hasBacklogs && (
                      <div className="bg-card px-4 py-2">
                        {semBacklogs.map((b, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 text-xs">
                            <div><span className="font-mono text-danger/70 mr-2">{b.subject.code}</span><span className="font-medium text-ink">{b.subject.name}</span><span className="text-muted ml-2">({b.credits} cr)</span></div>
                            <span className="bg-danger text-white px-2 py-0.5 rounded text-[9px] font-bold">FAIL ({b.grade})</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2 bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
        <AlertTriangle size={14} className="text-danger mt-0.5 flex-shrink-0" />
        <p className="text-xs text-danger font-medium">
          Note: Any discrepancy noted should be brought to the notice of Controller of Examinations immediately at{' '}
          <a href="mailto:exam@jbiet.edu.in" className="underline">exam@jbiet.edu.in</a>
        </p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Timetable', href: '/dashboard/student/timetable', icon: <Clock size={18} /> },
          { label: 'Faculty', href: '/dashboard/student/faculty', icon: <UsersRound size={18} /> },
          { label: 'Documents', href: '/dashboard/student/documents', icon: <FileText size={18} /> },
          { label: 'Ask Doubts', href: '/dashboard/student/chatbot', icon: <MessageCircle size={18} /> },
          { label: 'Profile', href: '/dashboard/student/profile', icon: <User size={18} /> },
        ].map(link => (
          <Link key={link.href} href={link.href}>
            <div className="bg-card rounded-xl border border-border p-3 hover:shadow-sm hover:border-blue/30 transition-all text-center group cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-surface flex items-center justify-center mx-auto mb-1.5 group-hover:bg-blue-light transition-colors">
                <span className="text-secondary group-hover:text-blue transition-colors">{link.icon}</span>
              </div>
              <p className="text-[11px] font-semibold text-ink">{link.label}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
