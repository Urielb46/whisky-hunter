'use client';

import { useState, useEffect } from 'react';

const AGE_KEY = 'wh_age_verified';
const API_BASE = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000';

export function AgeGateModal() {
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verified = localStorage.getItem(AGE_KEY);
    if (!verified) setVisible(true);
  }, []);

  async function confirm() {
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/age-gate/confirm`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true, country: 'US' }),
      });
    } catch {
      // continue even if API unreachable — localStorage gate still works
    }
    localStorage.setItem(AGE_KEY, '1');
    setLoading(false);
    setVisible(false);
  }

  function deny() {
    window.location.href = 'https://responsibility.org/';
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(8px)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-8 text-center"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        }}
      >
        <div className="text-5xl mb-4">🥃</div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
        >
          Welcome to WhiskyHunter
        </h2>
        <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
          This site contains information about alcohol. You must be of legal drinking age in your country to continue.
        </p>

        <p className="text-xs font-semibold uppercase tracking-widest mb-4" style={{ color: 'var(--text-subtle)' }}>
          Are you 21 years of age or older?
        </p>

        <div className="flex flex-col gap-2">
          <button
            onClick={confirm}
            disabled={loading}
            className="w-full rounded-xl py-3 text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-60"
            style={{ background: 'var(--primary)', color: '#0A0A0A' }}
          >
            {loading ? 'Confirming…' : 'Yes, I am 21 or older'}
          </button>
          <button
            onClick={deny}
            className="w-full rounded-xl py-3 text-sm font-medium transition-colors hover:bg-white/5"
            style={{ color: 'var(--text-muted)' }}
          >
            No, take me back
          </button>
        </div>

        <p className="mt-4 text-xs" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>
          🔞 Please drink responsibly
        </p>
      </div>
    </div>
  );
}
