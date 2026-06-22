'use client';

import { useEffect, useState } from 'react';

interface Notice {
  id: string;
  title: string;
  content: string | null;
  fileUrl: string | null;
  isNew: boolean;
  publishedAt: string;
}

export default function AdminNoticesPage() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const fetchNotices = () => {
    fetch('/api/notices?limit=50')
      .then(r => r.json())
      .then(data => setNotices(data.notices || []))
      .catch(console.error);
  };

  useEffect(() => { fetchNotices(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setMessage('');

    try {
      const res = await fetch('/api/notices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), content: content.trim() || null, fileUrl: fileUrl.trim() || null }),
      });

      if (res.ok) {
        setTitle('');
        setContent('');
        setFileUrl('');
        setMessage('Notice published successfully');
        fetchNotices();
      } else {
        const data = await res.json();
        setMessage(data.error || 'Failed to publish');
      }
    } catch {
      setMessage('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Manage Notices</h1>

      {/* Post New Notice */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold text-gray-700 mb-4">Post New Notice</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Notice title"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none"
            required
          />
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Optional description"
            rows={2}
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none"
          />
          <input
            type="url"
            value={fileUrl}
            onChange={e => setFileUrl(e.target.value)}
            placeholder="Link to PDF/document (optional)"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-[#1f4e5f] outline-none"
          />
          {message && <p className="text-sm text-green-600">{message}</p>}
          <button
            type="submit"
            disabled={loading}
            className="bg-[#e5a100] hover:bg-[#d4940a] text-white px-6 py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'Publishing...' : 'Publish Notice'}
          </button>
        </form>
      </div>

      {/* Existing Notices */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="bg-[#1f4e5f] px-6 py-3">
          <h2 className="text-white font-semibold">Published Notices ({notices.length})</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {notices.map(notice => (
            <div key={notice.id} className="px-6 py-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-800">{notice.title}</p>
                {notice.content && <p className="text-xs text-gray-500">{notice.content}</p>}
              </div>
              <span className="text-xs text-gray-400">
                {new Date(notice.publishedAt).toLocaleDateString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
