'use client';

import { useEffect, useState } from 'react';
import { FileText, Plus, Trash2, Upload, MessageSquare, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

interface FacultyOption { id: string; name: string; employeeId: string; designation: string | null; }
interface Comment { content: string; createdAt: string; faculty: { name: string }; }
interface Document {
  id: string; title: string; type: string; fileName: string; createdAt: string;
  submittedTo: { name: string; employeeId: string } | null;
  checkerPassed: boolean | null; isShowcased: boolean;
  comments: Comment[];
}

const typeLabels: Record<string, string> = { INTERNSHIP_REPORT: 'Internship Report', MINI_PROJECT_REPORT: 'Mini Project', MAJOR_PROJECT_REPORT: 'Major Project', PPT: 'Presentation', OTHER: 'Other' };

function getStatus(doc: Document): { label: string; color: string; icon: React.ReactNode } {
  if (doc.isShowcased) return { label: 'Published', color: 'bg-success-light text-success', icon: <CheckCircle size={11} /> };
  if (doc.comments.length > 0) return { label: 'Reviewed', color: 'bg-blue-light text-blue', icon: <MessageSquare size={11} /> };
  return { label: 'Pending Review', color: 'bg-orange-light text-orange', icon: <Clock size={11} /> };
}

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [showUpload, setShowUpload] = useState(false);
  const [form, setForm] = useState({ title: '', type: 'INTERNSHIP_REPORT', description: '', submittedToId: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDocs = () => {
    fetch('/api/documents').then(r => r.json()).then(d => setDocuments(d.documents || [])).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDocs();
    fetch('/api/auth/me').then(r => r.json()).then(data => {
      if (data.profile?.branchId) return fetch(`/api/faculty?branchId=${data.profile.branchId}`);
      return fetch('/api/faculty');
    }).then(r => r.json()).then(d => setFacultyList(d.faculty || [])).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setMessage('');
    if (!form.submittedToId) { setError('Please select a faculty guide.'); return; }
    try {
      const res = await fetch('/api/documents', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, fileUrl: `/uploads/mock-${Date.now()}.pdf`, fileName: `${form.title.replace(/\s+/g, '_')}.pdf`, fileSize: 1024000, mimeType: 'application/pdf' }),
      });
      const data = await res.json();
      if (res.ok) { setMessage('Document submitted!'); setShowUpload(false); setForm({ title: '', type: 'INTERNSHIP_REPORT', description: '', submittedToId: '' }); fetchDocs(); }
      else setError(data.error || 'Failed');
    } catch { setError('Network error'); }
  };

  const handleDelete = async (docId: string, hasComments: boolean) => {
    if (hasComments) { setError('Cannot delete — has faculty comments. Upload a new version instead.'); return; }
    if (!confirm('Delete this submission? This cannot be undone.')) return;
    setError(''); setMessage('');
    const res = await fetch(`/api/documents?id=${docId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) { setMessage('Document deleted.'); fetchDocs(); }
    else setError(data.error || 'Delete failed');
  };

  if (loading) return <div className="p-8 text-center text-muted text-sm">Loading...</div>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink flex items-center gap-2"><FileText size={20} className="text-blue" /> My Documents</h1>
        <button onClick={() => setShowUpload(!showUpload)} className="flex items-center gap-1.5 bg-blue hover:bg-blue-hover text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm">
          <Plus size={14} /> {showUpload ? 'Cancel' : 'New Submission'}
        </button>
      </div>

      {(message || error) && (
        <div className={`px-4 py-2.5 rounded-xl text-sm font-medium ${message ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
          {message || error}
        </div>
      )}

      {/* Upload Form */}
      {showUpload && (
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-4 flex items-center gap-2"><Upload size={14} className="text-blue" /> Submit New Document</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Document Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none">
                  {Object.entries(typeLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Submit To (Faculty Guide) *</label>
                <select value={form.submittedToId} onChange={e => setForm(p => ({ ...p, submittedToId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none">
                  <option value="">— Select Faculty —</option>
                  {facultyList.map(f => <option key={f.id} value={f.id}>{f.name} ({f.employeeId})</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Title *</label>
              <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} required
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none" placeholder="e.g. Internship at TCS — Final Report" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Description (optional)</label>
              <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 outline-none" />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-secondary uppercase mb-1.5">Upload File</label>
              <input type="file" accept=".pdf,.ppt,.pptx" className="w-full text-sm border border-border rounded-xl px-3 py-2" />
              <p className="text-[10px] text-muted mt-1">PDF, PPT, PPTX. Max 25MB. (S3 storage required for real uploads)</p>
            </div>
            <button type="submit" className="bg-blue hover:bg-blue-hover text-white px-6 py-2.5 rounded-xl text-xs font-semibold shadow-sm">Submit Document</button>
          </form>
        </div>
      )}

      {/* Documents List */}
      {documents.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center shadow-sm">
          <FileText size={32} className="text-muted mx-auto mb-2" />
          <p className="text-sm text-muted">No documents submitted yet.</p>
          <p className="text-xs text-muted mt-1">Click "New Submission" to get started.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {documents.map(doc => {
            const status = getStatus(doc);
            const hasComments = doc.comments.length > 0;
            return (
              <div key={doc.id} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-blue-light text-blue px-2 py-0.5 rounded-lg text-[9px] font-bold">{typeLabels[doc.type] || doc.type}</span>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[9px] font-bold ${status.color}`}>{status.icon} {status.label}</span>
                    </div>
                    <h3 className="text-sm font-bold text-ink">{doc.title}</h3>
                    <p className="text-[10px] text-muted mt-0.5">
                      {doc.fileName} · Submitted to {doc.submittedTo?.name || '—'} · {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                    </p>
                    {/* Comments preview */}
                    {hasComments && (
                      <div className="mt-2 pl-3 border-l-2 border-blue space-y-1">
                        {doc.comments.slice(0, 2).map((c, i) => (
                          <p key={i} className="text-[10px] text-secondary"><span className="font-semibold">{c.faculty.name}:</span> {c.content.slice(0, 80)}{c.content.length > 80 ? '...' : ''}</p>
                        ))}
                        {doc.comments.length > 2 && <p className="text-[10px] text-blue">+{doc.comments.length - 2} more</p>}
                      </div>
                    )}
                  </div>
                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => handleDelete(doc.id, hasComments)} title={hasComments ? 'Cannot delete (has comments)' : 'Delete'}
                      className={`p-1.5 rounded-lg transition-colors ${hasComments ? 'text-muted cursor-not-allowed opacity-40' : 'text-secondary hover:text-danger hover:bg-danger-light'}`}
                      disabled={hasComments}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
