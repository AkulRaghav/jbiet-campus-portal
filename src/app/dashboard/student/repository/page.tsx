'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, Filter, BookOpen, MessageSquare } from 'lucide-react';

interface RepositoryDoc {
  id: string; title: string; type: string; abstract: string | null; createdAt: string;
  student: { name: string; registrationNo: string; batchYear: number; branch: { id: string; shortName: string } };
}

interface Branch { id: string; name: string; shortName: string; }

const typeLabels: Record<string, string> = {
  INTERNSHIP_REPORT: 'Internship', MINI_PROJECT_REPORT: 'Mini Project',
  MAJOR_PROJECT_REPORT: 'Major Project', PPT: 'Presentation', OTHER: 'Other',
};

export default function RepositoryPage() {
  const [docs, setDocs] = useState<RepositoryDoc[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDocs = (searchQuery = '', cat = '', branch = '') => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchQuery) params.append('search', searchQuery);
    if (cat) params.append('category', cat);
    if (branch) params.append('branchId', branch);
    fetch(`/api/repository?${params}`)
      .then(r => r.json())
      .then(d => setDocs(d.documents || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
    fetch('/api/branches').then(r => r.json()).then(d => setBranches(d.branches || [])).catch(console.error);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchDocs(search, category, branchId);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink flex items-center gap-2">
          <BookOpen size={20} className="text-blue" /> Project Repository
        </h1>
      </div>

      {/* Search & Filters */}
      <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input type="text" value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by project title, topic, or author name..."
              className="w-full pl-10 pr-4 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
          </div>
          <div className="flex gap-2">
            <select value={category} onChange={e => { setCategory(e.target.value); fetchDocs(search, e.target.value, branchId); }}
              className="px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none">
              <option value="">All Types</option>
              <option value="INTERNSHIP_REPORT">Internship</option>
              <option value="MINI_PROJECT_REPORT">Mini Project</option>
              <option value="MAJOR_PROJECT_REPORT">Major Project</option>
            </select>
            <select value={branchId} onChange={e => { setBranchId(e.target.value); fetchDocs(search, category, e.target.value); }}
              className="px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none">
              <option value="">All Departments</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.shortName}</option>)}
            </select>
            <button type="submit" className="bg-blue hover:bg-blue-hover text-white px-4 py-2.5 rounded-xl text-sm font-semibold shadow-sm">
              <Filter size={15} />
            </button>
          </div>
        </form>
      </div>

      {/* Results */}
      {loading ? (
        <div className="p-8 text-center text-muted text-sm">Searching repository...</div>
      ) : docs.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center shadow-sm">
          <BookOpen size={32} className="text-muted mx-auto mb-3" />
          <p className="text-muted text-sm">No showcased projects found{search ? ` for "${search}"` : ''}.</p>
          <p className="text-muted text-xs mt-1">Projects appear here after faculty approval.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {docs.map(doc => (
            <div key={doc.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="bg-blue-light text-blue px-2 py-0.5 rounded-lg text-[10px] font-semibold">{typeLabels[doc.type] || doc.type}</span>
                    <span className="text-[10px] text-muted">{doc.student.branch.shortName} · Batch {doc.student.batchYear}</span>
                  </div>
                  <h3 className="text-sm font-bold text-ink">{doc.title}</h3>
                  <p className="text-xs text-secondary mt-0.5">by {doc.student.name} ({doc.student.registrationNo})</p>
                  {doc.abstract && <p className="text-xs text-muted mt-2 line-clamp-2">{doc.abstract}</p>}
                </div>
                <Link href={`/dashboard/student/repository/${doc.id}`}>
                  <button className="flex items-center gap-1.5 bg-blue hover:bg-blue-hover text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors flex-shrink-0">
                    <MessageSquare size={13} /> Read & Chat
                  </button>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
