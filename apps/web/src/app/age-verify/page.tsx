'use client';

/**
 * Age verification landing page — COMP-01 / AUTH-05
 *
 * Standalone page for age verification, used when:
 *  - A user arrives via a direct link before the AgeGateModal fires
 *  - JS is disabled (progressive enhancement)
 *  - The user is redirected here by require-age-gate middleware (HTTP 451 response)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';
const AGE_KEY  = 'wh_age_verified';

export default function AgeVerifyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);

  async function handleConfirm() {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/age-gate/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true, country: 'US' }),
      });
    } catch {
      // Proceed even if API unreachable — localStorage gate still works
    }

    try {
      localStorage.setItem(AGE_KEY, '1');
    } catch { /* SSR / private browsing — cookie-only path */ }

    setLoading(false);
    const returnTo = new URLSearchParams(window.location.search).get('return') ?? '/';
    router.push(returnTo);
  }

  function handleDeny() {
    setDenied(true);
    setTimeout(() => {
      window.location.href = 'https://responsibility.org/';
    }, 1500);
  }

  if (denied) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <span style={{ fontSize: 56 }}>🚫</span>
        <p className="mt-4 text-lg font-medium" style={{ color: 'var(--text)' }}>
          You must be of legal drinking age to use this site.
        </p>
        <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Redirecting…</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-24 px-4">
      <div
        className="w-full max-w-sm rounded-2xl p-10 text-center"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="text-5xl mb-4">🥃</div>

        <h1
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
        >
          Welcome to WhiskyHunter
        </h1>

        <p className="text-sm mb-8" style={{ color: 'var(--text-muted)', lineHeight: 1.7 }}>
          WhiskyHunter is a whisky price-comparison service. By continuing, you confirm
          that you are of legal drinking age in your country (18+ in UK/EU, 21+ in the US)
          and that the purchase or import of alcohol is legal in your jurisdiction.
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleDeny}
            className="flex-1 rounded-xl py-3 text-sm font-semibold transition-opacity"
            style={{
              background: 'var(--surface-elevated)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
            }}
          >
            I&apos;m under age
          </button>

          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 rounded-xl py-3 text-sm font-bold transition-opacity disabled:opacity-50"
            style={{ background: 'var(--primary)', color: '#0A0A0A' }}
          >
            {loading ? 'Confirming…' : 'I\'m of legal age'}
          </button>
        </div>

        <p className="mt-5 text-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.6 }}>
          By clicking &ldquo;I&apos;m of legal age&rdquo; you also agree to our{' '}
          <a href="/terms" style={{ color: 'var(--primary)' }}>Terms of Service</a>{' '}
          and{' '}
          <a href="/privacy" style={{ color: 'var(--primary)' }}>Privacy Policy</a>.
        </p>
      </div>
    </div>
  );
}
