'use client';

import { useEffect, useState } from 'react';

interface AuditEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  changes: string | null;
  ipAddress: string | null;
  createdAt: string;
  user: { username: string; role: string };
}

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/audit')
      .then(r => r.json())
      .then(d => setLogs(d.logs || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const actionColors: Record<string, string> = {
    CREATE_STUDENT: 'bg-green-100 text-green-700',
    UPDATE_STUDENT: 'bg-blue-100 text-blue-700',
    DELETE_STUDENT: 'bg-red-100 text-red-700',
    CREATE_FACULTY: 'bg-green-100 text-green-700',
    UPDATE_FEE: 'bg-amber-100 text-amber-700',
    UPDATE_RESULT: 'bg-purple-100 text-purple-700',
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#1f4e5f] mb-6">Audit Log</h1>
      <p className="text-sm text-gray-500 mb-4">All sensitive operations are tracked here for accountability.</p>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No audit entries yet.</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Action</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Entity</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(log.createdAt).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className="font-medium">{log.user.username}</span>
                    <span className="text-gray-400 text-xs ml-1">({log.user.role})</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${actionColors[log.action] || 'bg-gray-100 text-gray-700'}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {log.entityType}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
                    {log.changes ? JSON.stringify(JSON.parse(log.changes)).slice(0, 80) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
