'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Branch {
  id: string;
  name: string;
  shortName: string;
  sections: { id: string; name: string; batchYear: number }[];
}

export default function NewStudentPage() {
  const router = useRouter();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [form, setForm] = useState({
    name: '', fatherName: '', motherName: '', email: '', mobileNo: '',
    dateOfBirth: '', gender: '', nationality: 'Indian', caste: '',
    aadharNo: '', isScholarshipHolder: false, scholarshipAmount: 0,
    state: '', address: '', pincode: '', parentMobileNo: '', religion: '',
    moleIdentification1: '', moleIdentification2: '',
    batchYear: new Date().getFullYear(), branchId: '', sectionId: '',
    regulation: 'R22', stream: 'Engineering', admissionCategory: '',
    admissionNumber: '', dateOfAdmission: '',
  });

  useEffect(() => {
    fetch('/api/branches')
      .then(r => r.json())
      .then(data => setBranches(data.branches || []))
      .catch(console.error);
  }, []);

  const selectedBranch = branches.find(b => b.id === form.branchId);
  const sections = selectedBranch?.sections.filter(s => s.batchYear === form.batchYear) || [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
              type === 'number' ? Number(value) : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create student');
        if (data.details) {
          const fieldErrors = data.details.fieldErrors;
          if (fieldErrors) {
            const msgs = Object.entries(fieldErrors).map(([k, v]) => `${k}: ${(v as string[]).join(', ')}`);
            setError(msgs.join('\n'));
          }
        }
        return;
      }

      setSuccess(data.message || 'Student created successfully');
      setTimeout(() => router.push('/dashboard/admin/students'), 2000);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Add New Student</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm whitespace-pre-line">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-4 text-sm">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-6">
        {/* Academic Info */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#1f4e5f] mb-4 pb-2 border-b">Academic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Batch Year *</label>
              <input type="number" name="batchYear" value={form.batchYear} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Branch *</label>
              <select name="branchId" value={form.branchId} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" required>
                <option value="">Select Branch</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
              <select name="sectionId" value={form.sectionId} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" required>
                <option value="">Select Section</option>
                {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Regulation</label>
              <input type="text" name="regulation" value={form.regulation} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Stream</label>
              <input type="text" name="stream" value={form.stream} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Admission Category</label>
              <select name="admissionCategory" value={form.admissionCategory} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none">
                <option value="">Select</option>
                <option value="EAMCET">EAMCET</option>
                <option value="Management">Management</option>
                <option value="NRI">NRI</option>
                <option value="Lateral Entry">Lateral Entry</option>
              </select>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-[#1f4e5f] mb-4 pb-2 border-b">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Name (as per SSC) *</label>
              <input type="text" name="name" value={form.name} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Father&apos;s Name</label>
              <input type="text" name="fatherName" value={form.fatherName} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mother&apos;s Name</label>
              <input type="text" name="motherName" value={form.motherName} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mobile No.</label>
              <input type="text" name="mobileNo" value={form.mobileNo} onChange={handleChange} maxLength={10}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" name="dateOfBirth" value={form.dateOfBirth} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select name="gender" value={form.gender} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none">
                <option value="">Select</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
              <input type="text" name="nationality" value={form.nationality} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Religion</label>
              <input type="text" name="religion" value={form.religion} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Caste</label>
              <input type="text" name="caste" value={form.caste} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aadhar No.</label>
              <input type="text" name="aadharNo" value={form.aadharNo} onChange={handleChange} maxLength={12}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" placeholder="12-digit Aadhar number" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
              <input type="text" name="state" value={form.state} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
              <textarea name="address" value={form.address} onChange={handleChange} rows={2}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pincode</label>
              <input type="text" name="pincode" value={form.pincode} onChange={handleChange} maxLength={6}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Mobile No.</label>
              <input type="text" name="parentMobileNo" value={form.parentMobileNo} onChange={handleChange} maxLength={10}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MOLE Identification 1</label>
              <input type="text" name="moleIdentification1" value={form.moleIdentification1} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">MOLE Identification 2</label>
              <input type="text" name="moleIdentification2" value={form.moleIdentification2} onChange={handleChange}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
            </div>
            <div className="flex items-center gap-3 pt-6">
              <input type="checkbox" name="isScholarshipHolder" checked={form.isScholarshipHolder}
                onChange={handleChange} className="w-4 h-4 text-[#1f4e5f] rounded" id="scholarship" />
              <label htmlFor="scholarship" className="text-sm font-medium text-gray-700">Scholarship Holder</label>
            </div>
            {form.isScholarshipHolder && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scholarship Amount</label>
                <input type="number" name="scholarshipAmount" value={form.scholarshipAmount} onChange={handleChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" disabled={loading}
            className="bg-[#e5a100] hover:bg-[#d4940a] text-white px-8 py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors">
            {loading ? 'Creating...' : 'Create Student'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-2.5 rounded-lg font-medium transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
