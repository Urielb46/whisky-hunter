'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const CONSENT_KEY = 'wh_cookie_consent';
const AGE_VERIFIED_KEY = 'wh_age_verified';

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    const ageVerified = localStorage.getItem(AGE_VERIFIED_KEY);

    if (consent === null && ageVerified === '1') {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  function handleAccept() {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
  }

  function handleDecline() {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        backgroundColor: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        flexWrap: 'wrap',
      }}
    >
      <p
        style={{
          margin: 0,
          fontSize: '0.875rem',
          color: 'var(--text-muted)',
          flex: '1 1 auto',
          minWidth: '200px',
        }}
      >
        We use cookies to improve your experience.{' '}
        <Link
          href="/privacy"
          style={{ color: 'var(--primary)', textDecoration: 'underline' }}
        >
          Privacy Policy
        </Link>
      </p>

      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button
          onClick={handleDecline}
          style={{
            padding: '6px 14px',
            fontSize: '0.875rem',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            backgroundColor: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          Decline
        </button>
        <button
          onClick={handleAccept}
          style={{
            padding: '6px 14px',
            fontSize: '0.875rem',
            borderRadius: '6px',
            border: 'none',
            backgroundColor: 'var(--primary)',
            color: '#000',
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          Accept
        </button>
      </div>
    </div>
  );
}
