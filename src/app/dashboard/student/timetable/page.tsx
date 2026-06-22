'use client';

import { useEffect, useState } from 'react';

interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  subject: { name: string; code: string } | null;
  facultyName: string | null;
  room: string | null;
}

interface Timetable {
  id: string;
  semester: number;
  academicYear: string;
  slots: TimetableSlot[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetablePage() {
  const [timetable, setTimetable] = useState<Timetable | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/timetable')
      .then(r => r.json())
      .then(data => setTimetable(data.timetable))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading timetable...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Class Timetable</h1>

      {!timetable || timetable.slots.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No timetable published for your section yet.
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-[#1f4e5f] px-6 py-3">
            <h2 className="text-white font-semibold">
              Semester {timetable.semester} — {timetable.academicYear}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600 w-28">Day</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Time</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Subject</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Faculty</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Room</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {DAYS.map((day, dayIndex) => {
                  const daySlots = timetable.slots.filter(s => s.dayOfWeek === dayIndex);
                  if (daySlots.length === 0) return null;
                  return daySlots.map((slot, i) => (
                    <tr key={slot.id} className="hover:bg-gray-50">
                      {i === 0 && (
                        <td className="px-4 py-3 text-sm font-medium text-[#1f4e5f]" rowSpan={daySlots.length}>
                          {day}
                        </td>
                      )}
                      <td className="px-4 py-3 text-sm">{slot.startTime} - {slot.endTime}</td>
                      <td className="px-4 py-3 text-sm font-medium">
                        {slot.subject ? `${slot.subject.code} - ${slot.subject.name}` : 'Free Period'}
                      </td>
                      <td className="px-4 py-3 text-sm">{slot.facultyName || '—'}</td>
                      <td className="px-4 py-3 text-sm">{slot.room || '—'}</td>
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
