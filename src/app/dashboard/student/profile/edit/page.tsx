'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Save, Lock, Upload } from 'lucide-react';

interface Profile {
  name: string; fatherName: string | null; motherName: string | null;
  mobileNo: string | null; parentMobileNo: string | null; dateOfBirth: string | null;
  gender: string | null; nationality: string | null; caste: string | null;
  religion: string | null; aadharNo: string | null; isScholarshipHolder: boolean;
  state: string | null; address: string | null; pincode: string | null;
  moleIdentification1: string | null; moleIdentification2: string | null;
  photoUrl: string | null; aadharCardUrl: string | null; sscCertificateUrl: string | null;
  // Locked fields (display only)
  registrationNo: string; batch: string; regulation: string | null;
  branch: { name: string }; section: { name: string }; collegeCode: string; branchCode: string;
}

export default function EditProfilePage() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    name: '', fatherName: '', motherName: '', mobileNo: '', parentMobileNo: '',
    dateOfBirth: '', gender: '', nationality: '', caste: '', religion: '',
    aadharNo: '', isScholarshipHolder: false, state: '', address: '', pincode: '',
    moleIdentification1: '', moleIdentification2: '',
  });

  useEffect(() => {
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        const p = data.profile;
        setProfile(p);
        if (p) {
          setForm({
            name: p.name || '', fatherName: p.fatherName || '', motherName: p.motherName || '',
            mobileNo: p.mobileNo || '', parentMobileNo: p.parentMobileNo || '',
            dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth).toISOString().split('T')[0] : '',
            gender: p.gender || '', nationality: p.nationality || '', caste: p.caste || '',
            religion: p.religion || '', aadharNo: p.aadharNo || '',
            isScholarshipHolder: p.isScholarshipHolder || false,
            state: p.state || '', address: p.address || '', pincode: p.pincode || '',
            moleIdentification1: p.moleIdentification1 || '', moleIdentification2: p.moleIdentification2 || '',
          });
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const res = await fetch('/api/students/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.details) {
          const msgs = Object.entries(data.details).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`);
          setError(msgs.join('. '));
        } else {
          setError(data.error || 'Save failed');
        }
        return;
      }
      setMessage('Profile updated successfully');
      setTimeout(() => router.push('/dashboard/student/profile'), 1500);
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-secondary text-sm">Loading...</div>;
  if (!profile) return <div className="p-8 text-center text-secondary text-sm">Profile not found</div>;

  const LockedField = ({ label, value }: { label: string; value: string }) => (
    <div>
      <label className="block text-xs font-semibold text-secondary mb-1 flex items-center gap-1">
        <Lock size={10} /> {label}
      </label>
      <div className="w-full px-3 py-2.5 bg-surface border border-border rounded-xl text-sm text-secondary cursor-not-allowed">
        {value || '—'}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">Edit Profile</h1>
        <button onClick={() => router.back()} className="text-xs text-blue hover:underline">Cancel</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Locked Fields (display only) */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
            <Lock size={14} className="text-secondary" /> Academic Info (locked — contact admin to change)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <LockedField label="Registration No." value={profile.registrationNo} />
            <LockedField label="Batch" value={profile.batch} />
            <LockedField label="Branch" value={profile.branch.name} />
            <LockedField label="Section" value={profile.section.name} />
            <LockedField label="Regulation" value={profile.regulation || 'R22'} />
            <LockedField label="College Code" value={profile.collegeCode} />
            <LockedField label="Branch Code" value={profile.branchCode} />
          </div>
        </div>

        {/* Editable Fields */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-3">Personal Information (editable)</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Student Name (as per SSC) *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Father&apos;s Name</label>
              <input type="text" name="fatherName" value={form.fatherName} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Mother&apos;s Name</label>
              <input type="text" name="motherName" value={form.motherName} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Mobile No.</label>
              <input type="text" name="mobileNo" value={form.mobileNo} onChange={handleChange} maxLength={10}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" placeholder="10-digit number" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Parent Mobile No.</label>
              <input type="text" name="parentMobileNo" value={form.parentMobileNo} onChange={handleChange} maxLength={10}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Date of Birth</label>
              <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none">
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Nationality</label>
              <input type="text" name="nationality" value={form.nationality} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Religion</label>
              <input type="text" name="religion" value={form.religion} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Caste</label>
              <input type="text" name="caste" value={form.caste} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Aadhar No.</label>
              <input type="text" name="aadharNo" value={form.aadharNo} onChange={handleChange} maxLength={12}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" placeholder="12-digit Aadhar" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">State</label>
              <input type="text" name="state" value={form.state} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-ink mb-1">Address</label>
              <textarea name="address" value={form.address} onChange={handleChange} rows={2}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Pincode</label>
              <input type="text" name="pincode" value={form.pincode} onChange={handleChange} maxLength={6}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">MOLE Identification 1</label>
              <input type="text" name="moleIdentification1" value={form.moleIdentification1} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">MOLE Identification 2</label>
              <input type="text" name="moleIdentification2" value={form.moleIdentification2} onChange={handleChange}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="scholarship" name="isScholarshipHolder" checked={form.isScholarshipHolder}
                onChange={handleChange} className="w-4 h-4 rounded" />
              <label htmlFor="scholarship" className="text-sm text-ink">Scholarship Holder</label>
            </div>
          </div>
        </div>

        {/* Document Uploads */}
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-3 flex items-center gap-2">
            <Upload size={14} className="text-blue" /> Document Uploads
          </h2>
          <p className="text-xs text-muted mb-4">Upload or replace your documents. Accepted: JPEG, PNG, PDF. Max 5MB each.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Profile Photo</label>
              <input type="file" accept="image/jpeg,image/png" className="w-full text-sm border border-border rounded-xl px-3 py-2" />
              {profile.photoUrl && <p className="text-[10px] text-success mt-1">Current photo on file ✓</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Aadhar Card</label>
              <input type="file" accept="image/jpeg,image/png,application/pdf" className="w-full text-sm border border-border rounded-xl px-3 py-2" />
              {profile.aadharCardUrl && <p className="text-[10px] text-success mt-1">Document on file ✓</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">SSC / 10th Memo</label>
              <input type="file" accept="image/jpeg,image/png,application/pdf" className="w-full text-sm border border-border rounded-xl px-3 py-2" />
              {profile.sscCertificateUrl && <p className="text-[10px] text-success mt-1">Document on file ✓</p>}
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1">Apaar ID</label>
              <input type="file" accept="image/jpeg,image/png,application/pdf" className="w-full text-sm border border-border rounded-xl px-3 py-2" />
            </div>
          </div>
          <p className="text-[10px] text-muted mt-3">Note: File uploads require S3 storage configuration. In dev mode, URLs are saved as placeholders.</p>
        </div>

        {/* Save */}
        {error && <div className="bg-danger-light text-danger px-4 py-2.5 rounded-xl text-sm font-medium">{error}</div>}
        {message && <div className="bg-success-light text-success px-4 py-2.5 rounded-xl text-sm font-medium">{message}</div>}

        <button type="submit" disabled={saving}
          className="flex items-center gap-2 bg-blue hover:bg-blue-hover text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 shadow-md shadow-blue/20">
          <Save size={15} />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </form>
    </div>
  );
}
