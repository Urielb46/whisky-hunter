'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTrueCost } from '@/lib/api';
import type { PriceEntry } from '@/lib/api';

const DESTINATIONS = [
  { code: 'GB', label: '🇬🇧 United Kingdom', currency: 'GBP' },
  { code: 'US', label: '🇺🇸 United States', currency: 'USD' },
  { code: 'DE', label: '🇩🇪 Germany', currency: 'EUR' },
  { code: 'AU', label: '🇦🇺 Australia', currency: 'AUD' },
  { code: 'JP', label: '🇯🇵 Japan', currency: 'JPY' },
  { code: 'CA', label: '🇨🇦 Canada', currency: 'CAD' },
];

const CURRENCY_SYMS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', AUD: 'A$', JPY: '¥', CAD: 'CA$',
};

interface TrueCostWidgetProps {
  bestPrice: PriceEntry;
  volumeMl: number;
  abv: number;
}

export function TrueCostWidget({ bestPrice, volumeMl, abv }: TrueCostWidgetProps) {
  const [destination, setDestination] = useState('US');

  const dest = DESTINATIONS.find((d) => d.code === destination) ?? DESTINATIONS[1];
  const sym = CURRENCY_SYMS[dest.currency] ?? dest.currency + ' ';

  const { data, isLoading, isError } = useQuery({
    queryKey: ['truecost', bestPrice.priceLocal, bestPrice.currency, bestPrice.country, destination, volumeMl, abv],
    queryFn: () =>
      getTrueCost({
        priceLocal: bestPrice.priceLocal,
        currency: bestPrice.currency,
        retailerCountry: bestPrice.country,
        destinationCountry: destination,
        volumeMl,
        abv,
      }),
    enabled: !!bestPrice,
    staleTime: 5 * 60 * 1000,
  });

  // Build breakdown rows from actual API fields
  const rows = data
    ? [
        { label: 'Shelf price', value: data.shelfPrice },
        { label: 'Excise duty', value: data.exciseDuty },
        { label: 'Import duty', value: data.importDuty },
        { label: 'VAT', value: data.vat },
        { label: 'Est. shipping', value: data.shipping },
      ].filter((r) => r.value > 0)
    : [];

  return (
    <div
      className="rounded-xl p-5"
      style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold" style={{ color: 'var(--text)', fontFamily: 'Playfair Display, serif' }}>
          True Cost Calculator
        </h3>
        <select
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          className="rounded-lg px-2.5 py-1.5 text-xs outline-none"
          style={{
            background: 'var(--surface-elevated)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
          }}
        >
          {DESTINATIONS.map((d) => (
            <option key={d.code} value={d.code}>{d.label}</option>
          ))}
        </select>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-28 skeleton rounded" />
              <div className="h-4 w-16 skeleton rounded" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Could not calculate import cost.
        </p>
      )}

      {data && (
        <div className="space-y-2">
          {/* Shelf price always shown */}
          <div className="flex items-center justify-between text-sm">
            <span style={{ color: 'var(--text-muted)' }}>Shelf price</span>
            <span style={{ color: 'var(--text)' }}>{sym}{data.shelfPrice.toFixed(2)}</span>
          </div>

          {/* Extra costs */}
          {rows.slice(1).map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between text-sm">
              <span style={{ color: 'var(--text-muted)' }}>{label}</span>
              <span style={{ color: 'var(--text)' }}>+{sym}{value.toFixed(2)}</span>
            </div>
          ))}

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />

          {/* Total */}
          <div
            className="flex items-center justify-between rounded-lg px-3 py-2.5"
            style={{ background: 'var(--primary-muted)', border: '1px solid rgba(212,168,83,0.3)' }}
          >
            <span className="text-sm font-bold" style={{ color: 'var(--primary)' }}>
              Total ({dest.currency})
            </span>
            <span
              className="text-xl font-bold"
              style={{ color: 'var(--primary)', fontFamily: 'Playfair Display, serif' }}
            >
              {sym}{data.total.toFixed(2)}
            </span>
          </div>

          {/* Restriction warning */}
          {data.restriction?.warning && (
            <p className="pt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              ⚠️ {data.restriction.warning}
            </p>
          )}

          {!data.dutyDataAvailable && (
            <p className="pt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              Duty data unavailable for this destination. Total shows shelf price only.
            </p>
          )}

          <p className="text-xs" style={{ color: 'var(--text-muted)', opacity: 0.7 }}>
            Rates via ECB. Estimates only.
          </p>
        </div>
      )}
    </div>
  );
}
