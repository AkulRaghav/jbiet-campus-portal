'use client';

import { useEffect, useState } from 'react';
import { Ticket, Download, AlertTriangle, Building } from 'lucide-react';

interface ExamSession { id: string; name: string; sessionMonth: string; registered: boolean; registration: { examFeePaid: boolean; hallTicketReady: boolean } | null; }
interface Profile { name: string; registrationNo: string; branch: { name: string; shortName: string }; }

export default function HallTicketPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [tuitionDue, setTuitionDue] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/auth/me').then(r => r.json()),
      fetch('/api/exam-sessions').then(r => r.json()),
      fetch('/api/fees').then(r => r.json()),
    ]).then(([me, es, fees]) => {
      setProfile(me.profile);
      setSessions(es.sessions || []);
      // Check tuition/transport fee dues (these gate hall ticket, not exam fee)
      const tuitionTransportDue = (fees.feeRecords || [])
        .filter((f: { category: string }) => f.category === 'TUITION' || f.category === 'BUS')
        .reduce((s: number, f: { totalAmount: number; paidAmount: number; scholarshipAmount: number }) => s + Math.max(0, f.totalAmount - f.paidAmount - f.scholarshipAmount), 0);
      setTuitionDue(tuitionTransportDue);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDownload = (session: ExamSession) => {
    if (!profile) return;
    let content = `╔══════════════════════════════════════════════════════════╗\n`;
    content += `║  JB INSTITUTE OF ENGINEERING & TECHNOLOGY (Autonomous)   ║\n`;
    content += `║  EXAMINATION HALL TICKET                                 ║\n`;
    content += `╚══════════════════════════════════════════════════════════╝\n\n`;
    content += `H.T. Number    : ${profile.registrationNo}\n`;
    content += `Student Name   : ${profile.name}\n`;
    content += `Branch         : ${profile.branch.name} (${profile.branch.shortName})\n`;
    content += `Examination    : ${session.name}\n`;
    content += `Exam Session   : ${session.sessionMonth}\n\n`;
    content += `Exam Center    : [JBIET Main Campus]\n`;
    content += `Seating Block  : [To be announced]\n\n`;
    content += `${'─'.repeat(58)}\n`;
    content += `Instructions:\n`;
    content += `• Report 15 minutes before the scheduled exam time\n`;
    content += `• Carry this hall ticket and a valid college ID card\n`;
    content += `• Electronic devices are strictly prohibited\n`;
    content += `${'─'.repeat(58)}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HallTicket_${profile.registrationNo}_${session.sessionMonth}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading...</div>;

  // Sessions where exam registration + fee are complete
  const eligibleSessions = sessions.filter(s => s.registered && s.registration?.examFeePaid);

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink flex items-center gap-2"><Ticket size={20} className="text-blue" /> Hall Ticket</h1>

      {eligibleSessions.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center gap-2 bg-orange-light text-orange p-4 rounded-xl">
            <AlertTriangle size={18} />
            <p className="text-sm font-semibold">No hall tickets available. Complete exam registration and fee payment first.</p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {eligibleSessions.map(es => (
            <div key={es.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <h3 className="text-sm font-bold text-ink mb-1">{es.name}</h3>
              <p className="text-xs text-muted mb-4">Session: {es.sessionMonth}</p>

              {tuitionDue > 0 ? (
                /* Tuition/transport fees pending — must collect physically */
                <div className="flex items-start gap-3 bg-orange-light border border-orange/20 p-4 rounded-xl">
                  <Building size={18} className="text-orange flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-orange">Hall ticket ready — In-person collection required</p>
                    <p className="text-xs text-orange/80 mt-1">
                      You have ₹{tuitionDue.toLocaleString()} in pending tuition/transport fees. Your hall ticket cannot be downloaded online until these are cleared. Please collect it physically from the <strong>Admin Office</strong>.
                    </p>
                  </div>
                </div>
              ) : (
                /* All clear — can download */
                <div>
                  <div className="flex items-center gap-2 bg-success-light text-success p-3 rounded-xl mb-3">
                    <span className="text-sm font-semibold">✓ All fees cleared. Hall ticket available for download.</span>
                  </div>
                  {profile && (
                    <div className="bg-surface rounded-xl p-4 mb-3 grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-secondary text-[10px] uppercase">H.T. No</span><p className="font-bold text-ink">{profile.registrationNo}</p></div>
                      <div><span className="text-secondary text-[10px] uppercase">Name</span><p className="font-bold text-ink">{profile.name}</p></div>
                      <div><span className="text-secondary text-[10px] uppercase">Branch</span><p className="text-ink">{profile.branch.shortName}</p></div>
                      <div><span className="text-secondary text-[10px] uppercase">Session</span><p className="text-ink">{es.sessionMonth}</p></div>
                    </div>
                  )}
                  <button onClick={() => handleDownload(es)}
                    className="flex items-center gap-2 bg-blue hover:bg-blue-hover text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm transition-colors">
                    <Download size={15} /> Download Hall Ticket
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
