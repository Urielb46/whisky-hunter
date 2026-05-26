'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signIn } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      await refresh();
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  }

  const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <div className="w-full max-w-sm">
        {/* Card */}
        <div
          className="rounded-2xl p-8"
          style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
        >
          <div className="mb-6 text-center">
            <span style={{ fontSize: 36 }}>🥃</span>
            <h1
              className="mt-3 text-2xl font-bold"
              style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
            >
              Welcome back
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
              Sign in to your WhiskyHunter account
            </p>
          </div>

          {/* Google OAuth */}
          <a
            suppressHydrationWarning
            href={`${API_BASE}/api/auth/sign-in/social?providerId=google&callbackURL=${encodeURIComponent(typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001')}`}
            className="flex w-full items-center justify-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors hover:bg-white/5 mb-4"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </a>

          <div className="relative mb-4 flex items-center">
            <div className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
            <span className="px-3 text-xs" style={{ color: 'var(--text-muted)' }}>or email</span>
            <div className="flex-1" style={{ height: 1, background: 'var(--border)' }} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div
                className="rounded-lg px-3 py-2.5 text-sm"
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444' }}
              >
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--text-subtle)' }}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-xl px-4 py-2.5 pr-10 text-sm outline-none"
                  style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-2.5 text-sm font-bold transition-opacity disabled:opacity-50"
              style={{ background: 'var(--primary)', color: '#0A0A0A' }}
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" style={{ color: 'var(--primary)' }} className="font-medium hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
