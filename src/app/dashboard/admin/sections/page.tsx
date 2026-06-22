'use client';

import { useEffect, useState } from 'react';

interface Branch {
  id: string;
  name: string;
  shortName: string;
  code: string;
  branchCode: string;
  sections: { id: string; name: string; batchYear: number }[];
}

export default function AdminSectionsPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [newSection, setNewSection] = useState({ branchId: '', name: '', batchYear: new Date().getFullYear() });
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchBranches = () => {
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])).catch(console.error);
  };

  useEffect(() => { fetchBranches(); }, []);

  const handleAddSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSection.branchId || !newSection.name) {
      setMessage('Branch and section name are required');
      return;
    }
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSection),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('✅ Section created');
        setNewSection(prev => ({ ...prev, name: '' }));
        fetchBranches();
      } else {
        setMessage(`❌ ${data.error}`);
      }
    } catch {
      setMessage('❌ Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Branches & Sections</h1>

      {/* Add Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Add New Section</h2>
        <form onSubmit={handleAddSection} className="flex items-end gap-4 flex-wrap">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Branch</label>
            <select value={newSection.branchId} onChange={e => setNewSection(prev => ({ ...prev, branchId: e.target.value }))}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-[#1f4e5f] outline-none">
              <option value="">Select</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.shortName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Section Name</label>
            <input type="text" value={newSection.name} onChange={e => setNewSection(prev => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. A, B, C" className="px-3 py-2 border rounded-lg text-sm w-24 focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Batch Year</label>
            <input type="number" value={newSection.batchYear} onChange={e => setNewSection(prev => ({ ...prev, batchYear: parseInt(e.target.value) }))}
              className="px-3 py-2 border rounded-lg text-sm w-24 focus:ring-2 focus:ring-[#1f4e5f] outline-none" />
          </div>
          <button type="submit" disabled={loading}
            className="bg-[#e5a100] hover:bg-[#d4940a] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
            {loading ? '...' : 'Add'}
          </button>
          {message && <span className="text-sm">{message}</span>}
        </form>
      </div>

      {/* Branches List */}
      <div className="space-y-4">
        {branches.map(branch => (
          <div key={branch.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="bg-[#1f4e5f] px-6 py-3 flex items-center justify-between">
              <div>
                <h3 className="text-white font-semibold">{branch.name}</h3>
                <p className="text-white/70 text-xs">Code: {branch.code} | Branch Code: {branch.branchCode}</p>
              </div>
              <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs">
                {branch.sections.length} sections
              </span>
            </div>
            {branch.sections.length > 0 && (
              <div className="px-6 py-3">
                <div className="flex flex-wrap gap-2">
                  {branch.sections.map(sec => (
                    <span key={sec.id} className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm">
                      Section {sec.name} ({sec.batchYear})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
