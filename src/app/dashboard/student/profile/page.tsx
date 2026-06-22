'use client';

import { useEffect, useState } from 'react';

interface Profile {
  id: string;
  registrationNo: string;
  name: string;
  fatherName: string | null;
  motherName: string | null;
  mobileNo: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  nationality: string | null;
  caste: string | null;
  aadharNo: string | null;
  isScholarshipHolder: boolean;
  state: string | null;
  address: string | null;
  pincode: string | null;
  parentMobileNo: string | null;
  religion: string | null;
  batch: string;
  batchYear: number;
  regulation: string | null;
  stream: string | null;
  admissionCategory: string | null;
  collegeCode: string;
  branchCode: string;
  branch: { name: string; shortName: string };
  section: { name: string };
}

export default function StudentProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => setProfile(data.profile))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-gray-500">Loading profile...</div>;
  if (!profile) return <div className="p-8 text-center text-gray-500">Profile not found</div>;

  const Field = ({ label, value }: { label: string; value: string | null | undefined }) => (
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-medium text-gray-800 mt-0.5">{value || '—'}</p>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-ink">Student Profile</h1>
        <a href="/dashboard/student/profile/edit"
          className="flex items-center gap-1.5 bg-blue hover:bg-blue-hover text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors">
          Edit Profile
        </a>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Header */}
        <div className="bg-[#1f4e5f] p-6 flex items-center gap-4">
          <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white text-2xl font-bold">{profile.name.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-white text-xl font-bold">{profile.name}</h2>
            <p className="text-white/80">{profile.registrationNo}</p>
            <p className="text-[#e5a100] text-sm">{profile.branch.name} • Section {profile.section.name}</p>
          </div>
        </div>

        {/* Academic Info */}
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-[#1f4e5f] mb-4">Academic Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Registration No." value={profile.registrationNo} />
            <Field label="Batch" value={profile.batch} />
            <Field label="Branch" value={profile.branch.name} />
            <Field label="Section" value={profile.section.name} />
            <Field label="Regulation" value={profile.regulation} />
            <Field label="Stream" value={profile.stream} />
            <Field label="College Code" value={profile.collegeCode} />
            <Field label="Branch Code" value={profile.branchCode} />
            <Field label="Admission Category" value={profile.admissionCategory} />
          </div>
        </div>

        {/* Personal Info */}
        <div className="p-6">
          <h3 className="text-lg font-semibold text-[#1f4e5f] mb-4">Personal Information</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label="Father's Name" value={profile.fatherName} />
            <Field label="Mother's Name" value={profile.motherName} />
            <Field label="Date of Birth" value={profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString('en-IN') : null} />
            <Field label="Gender" value={profile.gender} />
            <Field label="Mobile No." value={profile.mobileNo} />
            <Field label="Parent Mobile No." value={profile.parentMobileNo} />
            <Field label="Nationality" value={profile.nationality} />
            <Field label="Religion" value={profile.religion} />
            <Field label="Caste" value={profile.caste} />
            <Field label="State" value={profile.state} />
            <Field label="Pincode" value={profile.pincode} />
            <Field label="Scholarship" value={profile.isScholarshipHolder ? 'Yes' : 'No'} />
            <div className="md:col-span-2">
              <Field label="Address" value={profile.address} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
