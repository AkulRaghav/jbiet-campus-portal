'use client';

import { useEffect, useState } from 'react';
import { BookCheck, CheckCircle, Clock, XCircle } from 'lucide-react';

interface ExamSession {
  id: string; name: string; examType: string; semester: number; sessionMonth: string;
  registrationOpen: string; registrationClose: string;
  registered: boolean; isOpen: boolean; isClosed: boolean;
  registration: { examFeePaid: boolean } | null;
}

export default function ExamRegistrationPage() {
  const [sessions, setSessions] = useState<ExamSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState('');

  const fetchSessions = () => {
    fetch('/api/exam-sessions').then(r => r.json()).then(d => setSessions(d.sessions || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleRegister = async (sessionId: string) => {
    setActionMsg('');
    const res = await fetch('/api/exam-registration', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examSessionId: sessionId }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMsg('Registered successfully!');
      fetchSessions();
    } else {
      setActionMsg(data.error || 'Registration failed');
    }
  };

  const handlePayFee = async (sessionId: string) => {
    setActionMsg('');
    const res = await fetch('/api/exam-registration', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examSessionId: sessionId, transactionId: `TXN_${Date.now()}` }),
    });
    const data = await res.json();
    if (res.ok) {
      setActionMsg('Exam fee paid!');
      fetchSessions();
    } else {
      setActionMsg(data.error || 'Payment failed');
    }
  };

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading...</div>;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink flex items-center gap-2"><BookCheck size={20} className="text-blue" /> Exam Registration</h1>

      {actionMsg && <div className="bg-blue-light text-blue px-4 py-2 rounded-xl text-sm font-medium">{actionMsg}</div>}

      {sessions.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-8 text-center shadow-sm">
          <p className="text-muted text-sm">No exam sessions are currently available for your batch/regulation.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map(es => (
            <div key={es.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold text-ink">{es.name}</h3>
                  <p className="text-xs text-muted mt-0.5">
                    {es.examType} · Semester {es.semester} · {es.sessionMonth}
                  </p>
                  <p className="text-[10px] text-secondary mt-1">
                    Registration: {new Date(es.registrationOpen).toLocaleDateString('en-IN')} — {new Date(es.registrationClose).toLocaleDateString('en-IN')}
                  </p>
                </div>

                {/* Status & Action */}
                <div className="text-right flex-shrink-0">
                  {es.registered && es.registration?.examFeePaid ? (
                    <span className="flex items-center gap-1 text-success text-xs font-bold"><CheckCircle size={14} /> Complete</span>
                  ) : es.registered && !es.registration?.examFeePaid ? (
                    <button onClick={() => handlePayFee(es.id)}
                      className="bg-orange hover:bg-orange/90 text-white px-4 py-1.5 rounded-lg text-xs font-semibold">
                      Pay Exam Fee
                    </button>
                  ) : es.isOpen ? (
                    <button onClick={() => handleRegister(es.id)}
                      className="bg-blue hover:bg-blue-hover text-white px-4 py-1.5 rounded-lg text-xs font-semibold shadow-sm">
                      Register
                    </button>
                  ) : es.isClosed ? (
                    <span className="flex items-center gap-1 text-danger text-xs font-semibold"><XCircle size={14} /> Closed</span>
                  ) : (
                    <span className="flex items-center gap-1 text-muted text-xs"><Clock size={14} /> Not Yet Open</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
