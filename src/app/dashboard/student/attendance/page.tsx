'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react';

interface AttendanceRecord { date: string; status: string; subject: { name: string; code: string }; }
interface SubjectSummary { subjectId: string; subjectName: string; total: number; present: number; percentage: number; }
interface Summary { totalClasses: number; totalPresent: number; overallPercentage: number; subjectWise: SubjectSummary[]; }

export default function StudentAttendancePage() {
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredDay, setHoveredDay] = useState<{ date: string; subjects: { name: string; status: string }[] } | null>(null);

  useEffect(() => {
    fetch('/api/attendance')
      .then(r => r.json())
      .then(data => { setRecords(data.records || []); setSummary(data.summary || null); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading attendance...</div>;
  if (!summary) return <div className="p-8 text-center text-muted text-sm">No attendance data.</div>;

  const pct = summary.overallPercentage;
  const atRisk = pct < 75;
  const canMiss = Math.max(0, Math.floor(summary.totalPresent / 0.75) - summary.totalClasses);
  const mustAttend = atRisk ? Math.ceil((0.75 * summary.totalClasses - summary.totalPresent) / 0.25) : 0;

  // Sort subjects: at-risk first
  const sortedSubjects = [...summary.subjectWise].sort((a, b) => a.percentage - b.percentage);

  // Build calendar heatmap data (last 90 days)
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 84); // 12 weeks back

  // Group records by date
  const recordsByDate = new Map<string, { present: number; absent: number; subjects: { name: string; status: string }[] }>();
  for (const rec of records) {
    const dateKey = rec.date.split('T')[0];
    if (!recordsByDate.has(dateKey)) recordsByDate.set(dateKey, { present: 0, absent: 0, subjects: [] });
    const entry = recordsByDate.get(dateKey)!;
    if (rec.status === 'PRESENT') entry.present++;
    else entry.absent++;
    entry.subjects.push({ name: rec.subject.name, status: rec.status });
  }

  // Build weekly trend data (rolling % by week)
  const weeklyTrend: { week: string; pct: number }[] = [];
  for (let w = 0; w < 12; w++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + w * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    let weekPresent = 0, weekTotal = 0;
    for (const rec of records) {
      const rd = new Date(rec.date);
      if (rd >= weekStart && rd <= weekEnd) {
        weekTotal++;
        if (rec.status === 'PRESENT') weekPresent++;
      }
    }
    if (weekTotal > 0) {
      weeklyTrend.push({ week: weekStart.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }), pct: Math.round((weekPresent / weekTotal) * 100) });
    }
  }

  // Generate calendar grid (12 weeks x 7 days)
  const calendarWeeks: { date: Date; dateKey: string; dayOfWeek: number }[][] = [];
  for (let w = 0; w < 12; w++) {
    const week: { date: Date; dateKey: string; dayOfWeek: number }[] = [];
    for (let d = 0; d < 7; d++) {
      const cellDate = new Date(startDate);
      cellDate.setDate(cellDate.getDate() + w * 7 + d);
      week.push({ date: cellDate, dateKey: cellDate.toISOString().split('T')[0], dayOfWeek: cellDate.getDay() });
    }
    calendarWeeks.push(week);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">My Attendance</h1>

      {/* Overall + Risk indicator */}
      <div className={`rounded-2xl border p-5 shadow-sm ${atRisk ? 'bg-danger-light/30 border-danger/20' : 'bg-card border-border'}`}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Ring */}
            <div className="relative w-16 h-16 flex-shrink-0">
              <svg className="w-16 h-16 ring-progress" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="#ECEDF1" strokeWidth="5" />
                <circle cx="32" cy="32" r="26" fill="none"
                  stroke={atRisk ? '#EF4444' : '#22C55E'}
                  strokeWidth="5"
                  strokeDasharray={`${(pct / 100) * 163.4} 163.4`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className={`text-sm font-bold ${atRisk ? 'text-danger' : 'text-success'}`}>{pct}%</span>
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-ink">{pct}% <span className="text-sm font-normal text-muted">Overall</span></p>
              <p className="text-xs text-muted">{summary.totalPresent}/{summary.totalClasses} classes attended</p>
            </div>
          </div>
          {/* Risk info */}
          <div className={`rounded-xl p-3 text-xs font-medium ${atRisk ? 'bg-danger-light text-danger' : 'bg-success-light text-success'}`}>
            {atRisk ? (
              <div className="flex items-start gap-2">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Below 75% — NOT eligible for exams</p>
                  <p className="font-normal mt-0.5">Must attend the next {mustAttend} consecutive classes to recover.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle size={14} />
                <span>Eligible. Can miss {canMiss} more before dropping below 75%.</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Weekly Trend Chart */}
      {weeklyTrend.length > 2 && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-3">Attendance Trend (Weekly)</h2>
          <div className="relative h-24">
            {/* 75% threshold line */}
            <div className="absolute left-0 right-0 border-t border-dashed border-danger/40" style={{ bottom: `${75}%` }}>
              <span className="absolute -top-3 right-0 text-[8px] text-danger font-bold">75%</span>
            </div>
            {/* Bars */}
            <div className="flex items-end h-full gap-1">
              {weeklyTrend.map((w, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${w.week}: ${w.pct}%`}>
                  <div className={`w-full rounded-t transition-all ${w.pct >= 75 ? 'bg-blue' : 'bg-danger'}`}
                    style={{ height: `${w.pct}%`, minHeight: '4px', opacity: i === weeklyTrend.length - 1 ? 1 : 0.6 }} />
                  <span className="text-[7px] text-muted truncate w-full text-center">{w.week.split(' ')[0]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Heatmap */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="text-sm font-bold text-ink mb-3">Daily Attendance (Last 12 Weeks)</h2>
        <div className="flex gap-0.5 text-[8px] text-muted mb-1 pl-6">
          {['Mon', '', 'Wed', '', 'Fri', '', ''].map((d, i) => <span key={i} className="w-3 text-center">{d}</span>)}
        </div>
        <div className="flex gap-1 overflow-x-auto">
          <div className="flex flex-col gap-0.5 text-[8px] text-muted pr-1">
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <span key={i} className="h-3 flex items-center">{d}</span>)}
          </div>
          {calendarWeeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-0.5">
              {week.map((day, di) => {
                const entry = recordsByDate.get(day.dateKey);
                const isWeekend = day.dayOfWeek === 0 || day.dayOfWeek === 6;
                const isFuture = day.date > today;
                let bg = 'bg-border-light'; // no class / weekend
                if (!isWeekend && !isFuture && entry) {
                  if (entry.absent === 0 && entry.present > 0) bg = 'bg-success';
                  else if (entry.present === 0 && entry.absent > 0) bg = 'bg-danger';
                  else if (entry.present > 0 && entry.absent > 0) bg = 'bg-orange'; // mixed
                }

                return (
                  <div key={di}
                    className={`w-3 h-3 rounded-sm ${bg} ${isFuture || isWeekend ? 'opacity-30' : 'cursor-pointer hover:ring-1 hover:ring-ink/30'}`}
                    onMouseEnter={() => entry && setHoveredDay({ date: day.dateKey, subjects: entry.subjects })}
                    onMouseLeave={() => setHoveredDay(null)}
                    title={day.dateKey}
                  />
                );
              })}
            </div>
          ))}
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 mt-3 text-[10px] text-muted">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-success" /> Present</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-danger" /> Absent</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-orange" /> Mixed</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-border-light" /> No class</span>
        </div>
        {/* Hover tooltip */}
        {hoveredDay && (
          <div className="mt-2 bg-surface rounded-lg p-2 border border-border text-[10px]">
            <p className="font-semibold text-ink">{new Date(hoveredDay.date).toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'short' })}</p>
            {hoveredDay.subjects.map((s, i) => (
              <p key={i} className={s.status === 'PRESENT' ? 'text-success' : 'text-danger'}>{s.status === 'PRESENT' ? '✓' : '✗'} {s.name}</p>
            ))}
          </div>
        )}
      </div>

      {/* Subject-wise Grid (sorted by risk) */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <h2 className="text-sm font-bold text-ink mb-3">Subject-wise Attendance</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedSubjects.map(sub => {
            const isLow = sub.percentage < 75;
            return (
              <div key={sub.subjectId} className={`rounded-xl p-3 border ${isLow ? 'border-danger/20 bg-danger-light/20' : 'border-border bg-surface/50'}`}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-ink truncate flex-1">{sub.subjectName}</span>
                  {isLow && <TrendingDown size={12} className="text-danger flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-border-light rounded-full h-1.5">
                    <div className={`h-1.5 rounded-full ${isLow ? 'bg-danger' : sub.percentage >= 85 ? 'bg-success' : 'bg-blue'}`}
                      style={{ width: `${sub.percentage}%` }} />
                  </div>
                  <span className={`text-xs font-bold min-w-[40px] text-right ${isLow ? 'text-danger' : 'text-ink'}`}>{sub.percentage}%</span>
                </div>
                <p className="text-[10px] text-muted mt-1">{sub.present}/{sub.total} classes</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
