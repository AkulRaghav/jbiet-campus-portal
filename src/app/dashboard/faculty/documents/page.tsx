'use client';

import { useEffect, useState } from 'react';
import { Download, MessageSquare, ChevronRight, FileText, ArrowLeft } from 'lucide-react';

interface BranchOption { id: string; name: string; shortName: string; }
interface SectionOption { id: string; name: string; batchYear: number; branchId: string; }
interface Comment { content: string; createdAt: string; faculty: { name: string }; }
interface Document {
  id: string; title: string; type: string; fileName: string; fileUrl: string;
  createdAt: string; checkerPassed: boolean | null;
  student: { id: string; name: string; registrationNo: string; branchId: string; sectionId: string };
  comments: Comment[];
}

const typeLabels: Record<string, string> = {
  INTERNSHIP_REPORT: 'Internship Report', MINI_PROJECT_REPORT: 'Mini Project',
  MAJOR_PROJECT_REPORT: 'Major Project', PPT: 'Presentation', OTHER: 'Other',
};

export default function FacultyDocumentsPage() {
  const [branches, setBranches] = useState<BranchOption[]>([]);
  const [sections, setSections] = useState<SectionOption[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [commentingDocId, setCommentingDocId] = useState<string | null>(null);
  const [commentMsg, setCommentMsg] = useState('');

  // Initial load: get all docs to extract branches/sections
  useEffect(() => {
    fetch('/api/documents?role=faculty')
      .then(r => r.json())
      .then(data => {
        setDocuments(data.documents || []);
        setBranches(data.branches || []);
        setSections(data.sections || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Filter documents by selected branch/section
  const filteredDocs = documents.filter(d => {
    if (selectedBranch && d.student.branchId !== selectedBranch) return false;
    if (selectedSection && d.student.sectionId !== selectedSection) return false;
    if (selectedStudent && d.student.id !== selectedStudent) return false;
    return true;
  });

  // Get unique students who have submissions in current filter
  const studentsWithDocs = Array.from(
    new Map(filteredDocs.map(d => [d.student.id, d.student])).values()
  );

  const filteredSections = sections.filter(s => !selectedBranch || s.branchId === selectedBranch);

  const handleDownload = async (docId: string) => {
    const res = await fetch(`/api/documents/download?id=${docId}`);
    const data = await res.json();
    if (data.success) {
      // In production, redirect to presigned URL. In dev, show the URL.
      alert(`Download ready: ${data.fileName}\nURL: ${data.downloadUrl}\n(In production, this would open the actual file from S3)`);
    } else {
      alert(data.error || 'Download failed');
    }
  };

  const handleComment = async (docId: string) => {
    if (!commentText.trim()) return;
    setCommentMsg('');
    const res = await fetch('/api/documents/comment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId: docId, content: commentText.trim() }),
    });
    const data = await res.json();
    if (res.ok) {
      setCommentMsg('Comment added');
      setCommentText('');
      setCommentingDocId(null);
      // Refresh docs to show new comment
      const refresh = await fetch('/api/documents?role=faculty');
      const refreshData = await refresh.json();
      setDocuments(refreshData.documents || []);
    } else {
      setCommentMsg(data.error || 'Failed');
    }
  };

  if (loading) return <div className="p-8 text-center text-secondary text-sm">Loading documents...</div>;

  // Breadcrumb navigation
  const breadcrumbs = ['All Branches'];
  if (selectedBranch) breadcrumbs.push(branches.find(b => b.id === selectedBranch)?.shortName || '');
  if (selectedSection) breadcrumbs.push(`Section ${filteredSections.find(s => s.id === selectedSection)?.name || ''}`);
  if (selectedStudent) breadcrumbs.push(studentsWithDocs.find(s => s.id === selectedStudent)?.registrationNo || '');

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-bold text-ink">Student Document Submissions</h1>

      {/* Breadcrumb */}
      <div className="flex items-center gap-1 text-xs text-secondary">
        <button onClick={() => { setSelectedBranch(''); setSelectedSection(''); setSelectedStudent(null); }} className="hover:text-blue">Documents</button>
        {selectedBranch && <><ChevronRight size={12} /><button onClick={() => { setSelectedSection(''); setSelectedStudent(null); }} className="hover:text-blue">{branches.find(b => b.id === selectedBranch)?.shortName}</button></>}
        {selectedSection && <><ChevronRight size={12} /><button onClick={() => setSelectedStudent(null)} className="hover:text-blue">Section {filteredSections.find(s => s.id === selectedSection)?.name}</button></>}
        {selectedStudent && <><ChevronRight size={12} /><span className="text-ink font-medium">{studentsWithDocs.find(s => s.id === selectedStudent)?.registrationNo}</span></>}
      </div>

      {documents.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-10 text-center text-secondary text-sm">
          No documents have been submitted to you yet.
        </div>
      ) : !selectedBranch ? (
        /* === BRANCH SELECTION === */
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <p className="text-sm font-semibold text-ink mb-3">Select Branch</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {branches.map(b => {
              const count = documents.filter(d => d.student.branchId === b.id).length;
              return (
                <button key={b.id} onClick={() => setSelectedBranch(b.id)}
                  className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-blue hover:bg-blue-light transition-all text-left">
                  <div>
                    <p className="text-sm font-semibold text-ink">{b.shortName}</p>
                    <p className="text-[11px] text-muted">{b.name}</p>
                  </div>
                  <span className="bg-surface text-secondary text-xs font-semibold px-2 py-0.5 rounded-full">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : !selectedSection ? (
        /* === SECTION SELECTION === */
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <button onClick={() => setSelectedBranch('')} className="flex items-center gap-1 text-xs text-blue mb-3 hover:underline"><ArrowLeft size={12} /> Back to Branches</button>
          <p className="text-sm font-semibold text-ink mb-3">Select Section — {branches.find(b => b.id === selectedBranch)?.shortName}</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {filteredSections.map(s => {
              const count = documents.filter(d => d.student.sectionId === s.id).length;
              return (
                <button key={s.id} onClick={() => setSelectedSection(s.id)}
                  className="flex items-center justify-between p-3 rounded-xl border border-border hover:border-blue hover:bg-blue-light transition-all text-left">
                  <div>
                    <p className="text-sm font-semibold text-ink">Section {s.name}</p>
                    <p className="text-[11px] text-muted">Batch {s.batchYear}</p>
                  </div>
                  <span className="bg-surface text-secondary text-xs font-semibold px-2 py-0.5 rounded-full">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : !selectedStudent ? (
        /* === STUDENT LIST === */
        <div className="bg-card rounded-2xl border border-border p-5 shadow-sm">
          <button onClick={() => setSelectedSection('')} className="flex items-center gap-1 text-xs text-blue mb-3 hover:underline"><ArrowLeft size={12} /> Back to Sections</button>
          <p className="text-sm font-semibold text-ink mb-3">Students with Submissions</p>
          {studentsWithDocs.length === 0 ? (
            <p className="text-sm text-muted">No submissions in this section.</p>
          ) : (
            <div className="space-y-2">
              {studentsWithDocs.map(s => {
                const stuDocs = filteredDocs.filter(d => d.student.id === s.id);
                const hasUnreviewed = stuDocs.some(d => d.comments.length === 0);
                return (
                  <button key={s.id} onClick={() => setSelectedStudent(s.id)}
                    className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-blue hover:bg-blue-light transition-all text-left">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-blue-light flex items-center justify-center text-blue font-bold text-xs">
                        {s.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-ink">{s.registrationNo}</p>
                        <p className="text-[11px] text-muted">{s.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-secondary">{stuDocs.length} doc{stuDocs.length !== 1 ? 's' : ''}</span>
                      {hasUnreviewed && <span className="w-2 h-2 rounded-full bg-orange" title="Pending review" />}
                      <ChevronRight size={14} className="text-muted" />
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* === DOCUMENT DETAIL VIEW === */
        <div className="space-y-4">
          <button onClick={() => setSelectedStudent(null)} className="flex items-center gap-1 text-xs text-blue hover:underline"><ArrowLeft size={12} /> Back to student list</button>

          {filteredDocs.map(doc => (
            <div key={doc.id} className="bg-card rounded-2xl border border-border p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-light flex items-center justify-center flex-shrink-0 mt-0.5">
                    <FileText size={18} className="text-blue" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-ink">{doc.title}</h3>
                    <p className="text-xs text-muted mt-0.5">
                      {doc.student.registrationNo} — {doc.student.name}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <span className="bg-blue-light text-blue px-2 py-0.5 rounded-lg text-[10px] font-semibold">{typeLabels[doc.type] || doc.type}</span>
                      <span className="text-[10px] text-muted">{doc.fileName}</span>
                      <span className="text-[10px] text-muted">{new Date(doc.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                      {doc.checkerPassed !== null && (
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${doc.checkerPassed ? 'bg-success-light text-success' : 'bg-danger-light text-danger'}`}>
                          {doc.checkerPassed ? 'Structure OK' : 'Issues Found'}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold ${doc.comments.length > 0 ? 'bg-success-light text-success' : 'bg-orange-light text-orange'}`}>
                        {doc.comments.length > 0 ? 'Reviewed' : 'Pending Review'}
                      </span>
                    </div>
                  </div>
                </div>
                <button onClick={() => handleDownload(doc.id)}
                  className="flex items-center gap-1.5 bg-blue hover:bg-blue-hover text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-sm transition-colors flex-shrink-0">
                  <Download size={13} /> Download
                </button>
              </div>

              {/* Comments for THIS specific document */}
              {doc.comments.length > 0 && (
                <div className="mt-4 pt-3 border-t border-border">
                  <p className="text-[11px] font-semibold text-secondary uppercase mb-2">Comments on this report</p>
                  <div className="space-y-2">
                    {doc.comments.map((c, i) => (
                      <div key={i} className="flex items-start gap-2 pl-3 border-l-2 border-blue">
                        <div className="flex-1">
                          <p className="text-xs text-ink">{c.content}</p>
                          <p className="text-[10px] text-muted mt-0.5">{c.faculty.name} · {new Date(c.createdAt).toLocaleString('en-IN')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add comment */}
              {commentingDocId === doc.id ? (
                <div className="mt-3 pt-3 border-t border-border">
                  <textarea value={commentText} onChange={e => setCommentText(e.target.value)}
                    placeholder="Add feedback, request revisions, or mark as approved..."
                    className="w-full px-3 py-2 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" rows={3} />
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => handleComment(doc.id)} disabled={!commentText.trim()}
                      className="bg-blue hover:bg-blue-hover text-white px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-50 shadow-sm">
                      Submit Comment
                    </button>
                    <button onClick={() => { setCommentingDocId(null); setCommentText(''); }}
                      className="text-xs text-secondary hover:text-ink">Cancel</button>
                    {commentMsg && <span className="text-xs text-success">{commentMsg}</span>}
                  </div>
                </div>
              ) : (
                <button onClick={() => setCommentingDocId(doc.id)}
                  className="mt-3 flex items-center gap-1.5 text-xs text-blue hover:underline font-medium">
                  <MessageSquare size={13} /> Add Comment
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
