'use client';

import { useEffect, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';

interface CalEvent { id: string; title: string; description: string | null; eventType: string; startDate: string; endDate: string | null; }

const typeColors: Record<string, string> = {
  EXAM: 'bg-danger-light text-danger border-danger/20',
  HOLIDAY: 'bg-success-light text-success border-success/20',
  REGISTRATION: 'bg-blue-light text-blue border-blue/20',
  RV_WINDOW: 'bg-orange-light text-orange border-orange/20',
  FEST: 'bg-[#EDE9FE] text-[#7C3AED] border-[#7C3AED]/20',
  ACADEMIC: 'bg-surface text-ink border-border',
};

const typeLabels: Record<string, string> = { EXAM: 'Exam', HOLIDAY: 'Holiday', REGISTRATION: 'Registration', RV_WINDOW: 'RV Window', FEST: 'Fest', ACADEMIC: 'Academic' };

export default function AcademicCalendarPage() {
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/calendar?month=${currentMonth}`)
      .then(r => r.json())
      .then(d => setEvents(d.events || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [currentMonth]);

  const navigateMonth = (dir: number) => {
    const [y, m] = currentMonth.split('-').map(Number);
    const d = new Date(y, m - 1 + dir, 1);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);
  };

  const monthLabel = new Date(currentMonth + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink flex items-center gap-2"><Calendar size={20} className="text-blue" /> Academic Calendar</h1>

      {/* Month navigation */}
      <div className="flex items-center justify-between bg-card rounded-xl border border-border p-3 shadow-sm">
        <button onClick={() => navigateMonth(-1)} className="p-1.5 rounded-lg hover:bg-surface transition-colors"><ChevronLeft size={16} /></button>
        <span className="text-sm font-bold text-ink">{monthLabel}</span>
        <button onClick={() => navigateMonth(1)} className="p-1.5 rounded-lg hover:bg-surface transition-colors"><ChevronRight size={16} /></button>
      </div>

      {/* Events list */}
      {loading ? (
        <div className="p-8 text-center text-muted text-sm">Loading...</div>
      ) : events.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
          <Calendar size={32} className="text-muted mx-auto mb-2" />
          <p className="text-muted text-sm">No events scheduled for {monthLabel}.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {events.map(ev => (
            <div key={ev.id} className={`rounded-xl border p-4 ${typeColors[ev.eventType] || typeColors.ACADEMIC}`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase">{typeLabels[ev.eventType] || ev.eventType}</span>
                  </div>
                  <p className="text-sm font-semibold">{ev.title}</p>
                  {ev.description && <p className="text-xs opacity-80 mt-0.5">{ev.description}</p>}
                </div>
                <div className="text-right text-xs">
                  <p className="font-medium">{new Date(ev.startDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>
                  {ev.endDate && <p className="opacity-70">to {new Date(ev.endDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
