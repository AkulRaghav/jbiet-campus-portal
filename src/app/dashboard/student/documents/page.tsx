'use client';

import { useEffect, useState } from 'react';

interface FacultyOption {
  id: string;
  name: string;
  employeeId: string;
  designation: string | null;
}

interface Document {
  id: string;
  title: string;
  type: string;
  fileName: string;
  createdAt: string;
  submittedTo: { name: string; employeeId: string } | null;
  checkerPassed: boolean | null;
  comments: { content: string; faculty: { name: string } }[];
}

export default function StudentDocumentsPage() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('INTERNSHIP_REPORT');
  const [description, setDescription] = useState('');
  const [submittedToId, setSubmittedToId] = useState('');
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [message, setMessage] = useState('');

  // Mark document notifications as read when page loads
  useEffect(() => {
    fetch('/api/notifications', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markAllRead: true }) }).catch(() => {});
  }, []);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    // Fetch faculty for this student's branch
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(data => {
        if (data.profile?.branchId) {
          return fetch(`/api/faculty?branchId=${data.profile.branchId}`);
        }
        return fetch('/api/faculty');
      })
      .then(r => r.json())
      .then(data => setFacultyList(data.faculty || []))
      .catch(console.error);

    // Fetch existing submissions
    fetch('/api/documents')
      .then(r => r.json())
      .then(data => setDocuments(data.documents || []))
      .catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!submittedToId) {
      setError('Please select which faculty member to submit this to.');
      return;
    }

    setUploading(true);

    try {
      // In production this would upload to S3 first, then pass the URL
      // For dev, we use a placeholder URL
      const res = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          type,
          description: description || null,
          submittedToId,
          fileUrl: `/uploads/mock-${Date.now()}.pdf`,
          fileName: `${title.replace(/\s+/g, '_')}.pdf`,
          fileSize: 1024000,
          mimeType: 'application/pdf',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Submission failed');
        return;
      }

      setMessage('Document submitted successfully! Your faculty guide will be notified.');
      setTitle('');
      setDescription('');
      setSubmittedToId('');

      // Refresh list
      const docsRes = await fetch('/api/documents');
      const docsData = await docsRes.json();
      setDocuments(docsData.documents || []);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const typeLabels: Record<string, string> = {
    INTERNSHIP_REPORT: 'Internship Report',
    MINI_PROJECT_REPORT: 'Mini Project',
    MAJOR_PROJECT_REPORT: 'Major Project',
    PPT: 'Presentation',
    OTHER: 'Other',
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-ink">Document Submission</h1>

      {/* Submission Form */}
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="text-sm font-bold text-ink mb-4">Submit New Document</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Document Type</label>
              <select value={type} onChange={e => setType(e.target.value)}
                className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none">
                <option value="INTERNSHIP_REPORT">Internship Report</option>
                <option value="MINI_PROJECT_REPORT">Mini Project Report</option>
                <option value="MAJOR_PROJECT_REPORT">Major Project Report</option>
                <option value="PPT">Presentation (PPT)</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Submit To (Faculty Guide) *</label>
              <select value={submittedToId} onChange={e => setSubmittedToId(e.target.value)}
                className={`w-full px-3 py-2.5 border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none ${!submittedToId && error ? 'border-danger' : 'border-border'}`}>
                <option value="">— Select Faculty —</option>
                {facultyList.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.employeeId}){f.designation ? ` — ${f.designation}` : ''}</option>
                ))}
              </select>
              {!submittedToId && error && <p className="text-danger text-xs mt-1">{error}</p>}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Title *</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none"
              placeholder="e.g. Internship at TCS — Final Report" required />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Description (optional)</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" rows={2}
              placeholder="Brief description of the document" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-ink mb-1.5">Upload File (PDF/PPT)</label>
            <input type="file" accept=".pdf,.ppt,.pptx" className="w-full px-3 py-2 border border-border rounded-xl text-sm" />
            <p className="text-muted text-[11px] mt-1">Accepted: PDF, PPT, PPTX. Max 25MB. (File storage requires S3 configuration)</p>
          </div>

          {message && <div className="bg-success-light text-success px-4 py-2 rounded-xl text-sm font-medium">{message}</div>}
          {error && !submittedToId ? null : error && <div className="bg-danger-light text-danger px-4 py-2 rounded-xl text-sm font-medium">{error}</div>}

          <button type="submit" disabled={uploading || !title}
            className="bg-blue hover:bg-blue-hover text-white px-6 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50 shadow-md shadow-blue/20 transition-colors">
            {uploading ? 'Submitting...' : 'Submit Document'}
          </button>
        </form>
      </div>

      {/* Previous Submissions */}
      {documents.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="text-sm font-bold text-ink mb-4">My Submissions ({documents.length})</h2>
          <div className="space-y-3">
            {documents.map(doc => (
              <div key={doc.id} className="flex items-start justify-between p-3 bg-surface rounded-xl">
                <div>
                  <p className="text-sm font-semibold text-ink">{doc.title}</p>
                  <p className="text-xs text-muted mt-0.5">
                    {typeLabels[doc.type] || doc.type} · Submitted to {doc.submittedTo?.name || 'Unknown'} · {new Date(doc.createdAt).toLocaleDateString('en-IN')}
                  </p>
                  {doc.comments.length > 0 && (
                    <div className="mt-2 pl-3 border-l-2 border-blue">
                      {doc.comments.map((c, i) => (
                        <p key={i} className="text-xs text-secondary"><span className="font-medium">{c.faculty.name}:</span> {c.content}</p>
                      ))}
                    </div>
                  )}
                </div>
                {doc.checkerPassed !== null && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${doc.checkerPassed ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
                    {doc.checkerPassed ? 'PASS' : 'ISSUES'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
