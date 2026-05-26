'use client';

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { AlertSetupModal } from './alert-setup-modal';

interface AlertButtonProps {
  productId: string;
  productName: string;
  currentPrice: number | null;
  currency: string;
}

export function AlertButton({ productId, productName, currentPrice, currency }: AlertButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="rounded-xl p-5 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
      >
        <p className="text-2xl mb-2">🔔</p>
        <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Price Alert</p>
        <p className="text-xs mt-1 mb-4" style={{ color: 'var(--text-muted)' }}>
          Get notified when the price drops below your target.
        </p>
        <button
          onClick={() => setOpen(true)}
          className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-colors hover:opacity-90"
          style={{
            background: 'var(--primary-muted)',
            color: 'var(--primary)',
            border: '1px solid rgba(212,168,83,0.3)',
          }}
        >
          <Bell size={14} />
          Set Price Alert
        </button>
      </div>

      {open && (
        <AlertSetupModal
          productId={productId}
          productName={productName}
          currentPrice={currentPrice}
          currency={currency}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
