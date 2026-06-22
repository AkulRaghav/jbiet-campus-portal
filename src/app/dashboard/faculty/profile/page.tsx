'use client';

import { useEffect, useState } from 'react';

interface FacultyProfile {
  name: string;
  employeeId: string;
  qualifications: string | null;
  designation: string | null;
  mobileNo: string | null;
  branch: { name: string; shortName: string };
  assignments: {
    subject: { name: string; code: string };
    section: { name: string };
    semester: number;
    academicYear: string;
    isClassTeacher: boolean;
  }[];
}

export default function FacultyProfilePage() {
  const [profile, setProfile] = useState<FacultyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => setProfile(data.profile))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-gray-500">Profile not found</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Faculty Profile</h1>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-[#1f4e5f] p-6 flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white text-xl font-bold">{profile.name.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">{profile.name}</h2>
            <p className="text-white/80">{profile.employeeId}</p>
            <p className="text-[#e5a100] text-sm">{profile.branch.name}</p>
          </div>
        </div>

        <div className="p-6 border-b">
          <h3 className="font-semibold text-[#1f4e5f] mb-3">Details</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Designation</p>
              <p className="text-sm font-medium">{profile.designation || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Qualifications</p>
              <p className="text-sm font-medium">{profile.qualifications || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Department</p>
              <p className="text-sm font-medium">{profile.branch.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Mobile</p>
              <p className="text-sm font-medium">{profile.mobileNo || '—'}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h3 className="font-semibold text-[#1f4e5f] mb-3">Current Assignments</h3>
          {profile.assignments.length === 0 ? (
            <p className="text-gray-500 text-sm">No current assignments.</p>
          ) : (
            <div className="space-y-2">
              {profile.assignments.map((a, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-sm">{a.subject.code} - {a.subject.name}</p>
                    <p className="text-xs text-gray-500">Section {a.section.name} • Sem {a.semester} • {a.academicYear}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.isClassTeacher ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                    {a.isClassTeacher ? 'Class Teacher' : 'Subject Teacher'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
