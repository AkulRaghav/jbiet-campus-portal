'use client';

import { useEffect, useState } from 'react';

interface FacultyMember {
  id: string;
  name: string;
  employeeId: string;
  designation: string | null;
  qualifications: string | null;
  branch: { name: string; shortName: string };
  assignments: {
    subject: { name: string; code: string };
    section: { name: string };
    isClassTeacher: boolean;
  }[];
}

export default function StudentFacultyPage() {
  const [faculty, setFaculty] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get student's branch, then fetch faculty for that branch
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.profile?.branchId) {
          return fetch(`/api/faculty?branchId=${data.profile.branchId}`);
        }
        return fetch('/api/faculty');
      })
      .then(r => r.json())
      .then(data => setFaculty(data.faculty || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading faculty...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Department Faculty</h1>

      {faculty.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-500">
          No faculty information available.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {faculty.map(f => (
            <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-[#1f4e5f] rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white font-bold text-lg">{f.name.charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-[#1f4e5f]">{f.name}</h3>
                  <p className="text-sm text-gray-500">{f.designation || 'Faculty'}</p>
                  <p className="text-xs text-gray-400 mt-1">{f.qualifications}</p>
                  {f.assignments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {f.assignments.map((a, i) => (
                        <span key={i} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                          {a.subject.code}
                          {a.isClassTeacher && ' (CT)'}
                        </span>
                      ))}
                    </div>
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
