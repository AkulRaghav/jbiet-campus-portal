'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock } from 'lucide-react';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    if (newPassword.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { setError('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newPassword }) });
      if (!res.ok) { const d = await res.json(); setError(d.error || 'Failed'); return; }
      router.push('/login');
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-blue-light flex items-center justify-center mx-auto mb-3"><Lock size={20} className="text-blue" /></div>
          <h1 className="text-xl font-bold text-ink">Set New Password</h1>
          <p className="text-muted text-sm mt-1">You must change your password to continue</p>
        </div>
        <div className="bg-card rounded-2xl border border-border shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="bg-danger-light text-danger px-4 py-2 rounded-xl text-sm font-medium">{error}</div>}
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">New Password</label>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" placeholder="Min 8 characters" required minLength={8} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink mb-1.5">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none" placeholder="Re-enter" required />
            </div>
            <button type="submit" disabled={loading} className="w-full bg-blue hover:bg-blue-hover text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-blue/20">
              {loading ? 'Updating...' : 'Set Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
