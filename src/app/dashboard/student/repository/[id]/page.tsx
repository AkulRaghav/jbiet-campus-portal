'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Send, FileText, Bot, User, BookOpen } from 'lucide-react';

interface DocInfo {
  id: string; title: string; type: string; fileUrl: string; fileName: string;
  abstract: string | null; extractedText: string | null;
  student: { name: string; registrationNo: string; branch: { shortName: string } };
}

interface ChatMsg { role: 'user' | 'assistant'; content: string; }

export default function DocumentReaderPage() {
  const params = useParams();
  const docId = params.id as string;
  const [doc, setDoc] = useState<DocInfo | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [docLoading, setDocLoading] = useState(true);
  const [fileAccessible, setFileAccessible] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/repository/doc?id=${docId}`)
      .then(r => r.json())
      .then(d => {
        setDoc(d.document);
        setMessages([{
          role: 'assistant',
          content: `I've loaded "${d.document?.title || 'this document'}". Ask me anything about its content — I'll answer based on what's in the paper and clearly mark if I need to go beyond it.`
        }]);
        // Check if the actual file is accessible
        if (d.document?.fileUrl) {
          fetch(d.document.fileUrl, { method: 'HEAD' }).then(r => setFileAccessible(r.ok)).catch(() => setFileAccessible(false));
        }
      })
      .catch(console.error)
      .finally(() => setDocLoading(false));
  }, [docId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const res = await fetch('/api/repository/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docId, message: userMsg }),
      });
      const data = await res.json();
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Unable to process.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Network error.' }]);
    } finally { setLoading(false); }
  };

  if (docLoading) return <div className="p-8 text-center text-muted text-sm">Loading document...</div>;
  if (!doc) return <div className="p-8 text-center text-muted text-sm">Document not found.</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/student/repository" className="text-blue hover:underline flex items-center gap-1 text-xs">
          <ArrowLeft size={14} /> Back to Repository
        </Link>
      </div>

      <div className="bg-card rounded-xl border border-border p-4 shadow-sm">
        <h1 className="text-sm font-bold text-ink">{doc.title}</h1>
        <p className="text-xs text-muted mt-0.5">{doc.student.name} · {doc.student.branch.shortName} · {doc.fileName}</p>
      </div>

      {/* Split pane */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[calc(100vh-250px)] min-h-[500px]">
        {/* Left: Document Preview */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center gap-2">
            <BookOpen size={14} className="text-blue" />
            <span className="text-xs font-semibold text-ink">Document Content</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {fileAccessible && doc.fileUrl.endsWith('.pdf') ? (
              /* Real PDF file is accessible — use embed */
              <embed src={doc.fileUrl} type="application/pdf" className="w-full h-full" />
            ) : doc.extractedText ? (
              /* No real file but we have extracted text — show as readable content */
              <div className="p-5 space-y-4">
                {doc.abstract && (
                  <div className="bg-blue-light rounded-xl p-4 border border-blue/10">
                    <p className="text-[10px] text-blue font-bold uppercase mb-1">Abstract</p>
                    <p className="text-xs text-ink leading-relaxed">{doc.abstract}</p>
                  </div>
                )}
                <div className="prose prose-xs max-w-none">
                  {doc.extractedText.split('\n\n').map((para, i) => {
                    // Detect chapter/section headings
                    if (para.match(/^(Chapter \d|References|Future Work|Technology Stack)/i)) {
                      return <h3 key={i} className="text-sm font-bold text-ink mt-4 mb-1">{para}</h3>;
                    }
                    if (para.startsWith('- ') || para.startsWith('• ')) {
                      return <p key={i} className="text-xs text-secondary pl-3 border-l-2 border-border my-1">{para}</p>;
                    }
                    return <p key={i} className="text-xs text-ink leading-relaxed mb-2">{para}</p>;
                  })}
                </div>
              </div>
            ) : (
              /* Neither file nor extracted text available */
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div>
                  <FileText size={40} className="text-muted mx-auto mb-3" />
                  <p className="text-sm font-medium text-ink">{doc.fileName}</p>
                  <p className="text-xs text-muted mt-1">Document content not yet extracted.</p>
                  <p className="text-[10px] text-muted mt-0.5">PDF preview requires S3 storage configuration.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: AI Chat */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col">
          <div className="px-4 py-2.5 border-b border-border bg-surface flex items-center gap-2">
            <Bot size={14} className="text-blue" />
            <span className="text-xs font-semibold text-ink">Ask about this document</span>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-6 h-6 rounded-lg bg-blue-light flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Bot size={12} className="text-blue" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                  msg.role === 'user' ? 'bg-blue text-white' : 'bg-surface text-ink border border-border'
                }`}>
                  <span className="whitespace-pre-wrap">{msg.content}</span>
                </div>
                {msg.role === 'user' && (
                  <div className="w-6 h-6 rounded-lg bg-blue flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User size={12} className="text-white" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-light flex items-center justify-center"><Bot size={12} className="text-blue" /></div>
                <div className="bg-surface border border-border rounded-xl px-3 py-2 text-xs text-muted">Analyzing document...</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <form onSubmit={sendMessage} className="p-3 border-t border-border flex gap-2">
            <input type="text" value={input} onChange={e => setInput(e.target.value)} disabled={loading}
              placeholder="Ask a question about this paper..."
              className="flex-1 px-3 py-2 border border-border rounded-xl text-xs focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" />
            <button type="submit" disabled={loading || !input.trim()}
              className="bg-blue hover:bg-blue-hover text-white p-2 rounded-xl disabled:opacity-40 transition-colors">
              <Send size={14} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
