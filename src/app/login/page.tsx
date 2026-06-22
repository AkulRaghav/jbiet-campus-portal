'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { LogIn, Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: username.trim(), password }) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      if (data.user.mustChangePassword) { router.push('/change-password'); return; }
      const routes: Record<string, string> = { ADMIN: '/dashboard/admin', STUDENT: '/dashboard/student', FACULTY: '/dashboard/faculty', ACCOUNTANT: '/dashboard/accountant', BUS_PROVIDER: '/dashboard/bus-provider' };
      router.push(routes[data.user.role] || '/dashboard');
    } catch { setError('Network error.'); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left half — Campus photo */}
      <div className="relative w-full lg:w-1/2 h-[35vh] lg:h-screen flex-shrink-0">
        <Image
          src="/images/campus.jpg"
          alt="JBIET Campus Building"
          fill
          className="object-cover"
          priority
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
        {/* Dark gradient overlay at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        {/* College name on the image */}
        <div className="absolute bottom-0 left-0 right-0 p-6 lg:p-10">
          <h1 className="text-white text-xl lg:text-2xl font-bold leading-tight">
            JB Institute of Engineering<br />& Technology
          </h1>
          <p className="text-white/60 text-xs lg:text-sm mt-2">
            UGC Autonomous · NAAC Accredited · AICTE Approved · Affiliated to JNTUH
          </p>
        </div>
      </div>

      {/* Right half — Login form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 bg-surface">
        <div className="w-full max-w-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-11 h-11 rounded-xl bg-blue flex items-center justify-center shadow-lg shadow-blue/20">
              <span className="text-white font-bold text-lg">JB</span>
            </div>
            <div>
              <p className="text-ink font-bold text-sm">JBIET</p>
              <p className="text-muted text-[10px]">Students Examination Portal</p>
            </div>
          </div>

          {/* Heading */}
          <h2 className="text-ink text-2xl font-bold mb-1">Welcome back</h2>
          <p className="text-secondary text-sm mb-7">Sign in to access your portal</p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-danger-light text-danger px-4 py-2.5 rounded-xl text-sm font-medium" role="alert">{error}</div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-ink mb-1.5">Username / Roll Number</label>
              <input
                id="username" type="text" value={username} onChange={e => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-ink placeholder:text-muted focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none transition-all"
                placeholder="e.g. 22671A0501 or admin" required autoComplete="username"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-ink mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="password" type={show ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm text-ink placeholder:text-muted focus:ring-2 focus:ring-blue/20 focus:border-blue outline-none transition-all pr-11"
                  placeholder="Enter password" required autoComplete="current-password"
                />
                <button type="button" onClick={() => setShow(!show)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink transition-colors" aria-label={show ? 'Hide' : 'Show'}>
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue hover:bg-blue-hover text-white font-semibold py-3 rounded-xl transition-colors disabled:opacity-50 shadow-lg shadow-blue/20 mt-2">
              {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <LogIn size={16} />}
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
            </button>
          </form>

          {/* Help text */}
          <div className="mt-6 pt-5 border-t border-border">
            <p className="text-center text-[11px] text-muted leading-relaxed">
              Students: use your <span className="text-ink font-medium">Roll Number</span> as username<br />
              Faculty/Staff: use your <span className="text-ink font-medium">Employee ID</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
