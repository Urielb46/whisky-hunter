'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { SearchResult } from '@/lib/api';

const CURRENCY_SYMBOLS: Record<string, string> = {
  GBP: '£', USD: '$', EUR: '€', CAD: 'CA$',
};

/**
 * Returns a proxied image URL to bypass retailer hotlink protection.
 * The /api/img route fetches images server-side with a browser-like Referer.
 */
function proxyImageUrl(url: string): string {
  return `/api/img?url=${encodeURIComponent(url)}`;
}

const COUNTRY_FLAG: Record<string, string> = {
  GB: '🇬🇧', US: '🇺🇸', FR: '🇫🇷', DE: '🇩🇪', CA: '🇨🇦',
  JP: '🇯🇵', AU: '🇦🇺', IT: '🇮🇹', ES: '🇪🇸', NL: '🇳🇱',
};

// ─── Deterministic hash ───────────────────────────────────────────────────────
function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) { h = (((h << 5) + h) + s.charCodeAt(i)) | 0; }
  return Math.abs(h);
}

// ─── SVG Whisky Bottle Placeholder ───────────────────────────────────────────
interface BottleColors {
  bg1: string; bg2: string;
  bottle: string; bottleDark: string;
  liquid: string; liquidLight: string;
  label: string; accent: string;
}

function getCategoryColors(category: string, region: string | null): BottleColors {
  if (region === 'Islay' || region === 'Campbeltown') {
    return { bg1: '#0D1F1A', bg2: '#182E28', bottle: '#2C4A42', bottleDark: '#1A3028',
             liquid: '#3D6B5E', liquidLight: '#4E8070', label: '#E8D5A0', accent: '#7BBFB0' };
  }
  if (category.startsWith('japanese')) {
    return { bg1: '#0F0F14', bg2: '#1A1A24', bottle: '#2A2A3D', bottleDark: '#1A1A2A',
             liquid: '#B8936A', liquidLight: '#D4A87A', label: '#F5EDD5', accent: '#D4A87A' };
  }
  if (category === 'bourbon' || category === 'tennessee' || category === 'american_whiskey') {
    return { bg1: '#1A0A00', bg2: '#2D1200', bottle: '#6B3010', bottleDark: '#4A2008',
             liquid: '#C8600E', liquidLight: '#E8801E', label: '#F5E0C0', accent: '#E8900E' };
  }
  if (category === 'rye') {
    return { bg1: '#0F0800', bg2: '#1E1200', bottle: '#5C4A10', bottleDark: '#3D3008',
             liquid: '#C8A020', liquidLight: '#E8C030', label: '#F5EAC0', accent: '#D4B020' };
  }
  if (category.startsWith('irish')) {
    return { bg1: '#060E06', bg2: '#0E1A0E', bottle: '#2A4A2A', bottleDark: '#1A301A',
             liquid: '#C4A050', liquidLight: '#D8B868', label: '#EEE5C5', accent: '#8FBF8F' };
  }
  if (region === 'Highland' || region === 'Highlands' || region === 'Islands') {
    return { bg1: '#080608', bg2: '#140E14', bottle: '#3A2A4A', bottleDark: '#28183A',
             liquid: '#D4A850', liquidLight: '#E8C068', label: '#F0E8D0', accent: '#B090D8' };
  }
  if (region === 'Lowland') {
    return { bg1: '#06080E', bg2: '#0E1220', bottle: '#28304A', bottleDark: '#181E38',
             liquid: '#C8C050', liquidLight: '#E0D870', label: '#F0EDD5', accent: '#90A8D8' };
  }
  if (category.startsWith('taiwanese') || category.startsWith('world')) {
    return { bg1: '#0A0614', bg2: '#160A20', bottle: '#3A1A4A', bottleDark: '#26103A',
             liquid: '#D460B0', liquidLight: '#E880C8', label: '#F5D8F0', accent: '#E060C0' };
  }
  // Default: Speyside / Scotch amber gold
  return { bg1: '#0E0800', bg2: '#1A1000', bottle: '#4A3010', bottleDark: '#302008',
           liquid: '#D4A840', liquidLight: '#E8C060', label: '#F5ECCB', accent: '#D4A840' };
}

function WhiskyBottleSVG({ distillery, category, region }: {
  distillery: string; category: string; region: string | null;
}) {
  const uid = `wb${djb2(distillery + category).toString(36)}`;
  const c = getCategoryColors(category, region);
  const catLabel = category.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
  const labelText = distillery.length > 14 ? distillery.slice(0, 13) + '…' : distillery;

  return (
    <svg viewBox="0 0 300 390" xmlns="http://www.w3.org/2000/svg"
         style={{ display: 'block', width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={`${uid}bg`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.bg1} />
          <stop offset="100%" stopColor={c.bg2} />
        </linearGradient>
        <linearGradient id={`${uid}bt`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c.bottleDark} />
          <stop offset="28%" stopColor={c.bottle} />
          <stop offset="72%" stopColor={c.bottle} />
          <stop offset="100%" stopColor={c.bottleDark} />
        </linearGradient>
        <linearGradient id={`${uid}lq`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={c.liquid} />
          <stop offset="42%" stopColor={c.liquidLight} />
          <stop offset="100%" stopColor={c.liquid} />
        </linearGradient>
        <linearGradient id={`${uid}lb`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={c.label} stopOpacity="0.92" />
          <stop offset="100%" stopColor={c.label} stopOpacity="0.78" />
        </linearGradient>
        <clipPath id={`${uid}cl`}>
          <path d="M 93,162 C 93,145 101,118 116,100 L 125,88 L 125,42 L 175,42 L 175,88 L 184,100 C 199,118 207,145 207,162 L 207,316 Q 207,322 201,322 L 99,322 Q 93,322 93,316 Z" />
        </clipPath>
      </defs>

      {/* Background */}
      <rect width="300" height="390" fill={`url(#${uid}bg)`} />

      {/* Subtle background grain */}
      {[47, 130, 213, 79, 195, 32, 160, 95, 250, 18, 145, 270].map((x, i) => (
        <circle key={i} cx={x} cy={((i * 37 + 40) % 350) + 20} r={1.2}
                fill={c.accent} fillOpacity={0.07} />
      ))}

      {/* Bottle body */}
      <path
        d="M 150,30 L 138,30 L 138,36 L 132,36 L 132,84 L 119,98
           C 101,114 89,140 87,164 L 87,320 Q 87,332 99,332
           L 201,332 Q 213,332 213,320 L 213,164
           C 211,140 199,114 181,98 L 168,84 L 168,36 L 162,36 L 162,30 Z"
        fill={`url(#${uid}bt)`}
      />

      {/* Liquid inside bottle */}
      <rect x="89" y="118" width="122" height="207"
            fill={`url(#${uid}lq)`} fillOpacity="0.82"
            clipPath={`url(#${uid}cl)`} />

      {/* Liquid surface highlight */}
      <ellipse cx="150" cy="118" rx="55" ry="5"
               fill={c.liquidLight} fillOpacity="0.25"
               clipPath={`url(#${uid}cl)`} />

      {/* Bottle highlight — left edge */}
      <path d="M 112,118 L 107,148 L 107,314 L 114,314 L 114,148 L 118,118 Z"
            fill="white" fillOpacity="0.06" />

      {/* Bottle highlight — right edge inner glint */}
      <path d="M 186,130 L 191,160 L 191,300 L 186,300 L 186,160 L 182,130 Z"
            fill="white" fillOpacity="0.04" />

      {/* Label background */}
      <rect x="95" y="192" width="110" height="82" rx="3"
            fill={`url(#${uid}lb)`} />
      {/* Label border */}
      <rect x="97" y="194" width="106" height="78" rx="2"
            fill="none" stroke={c.accent} strokeWidth="0.7" strokeOpacity="0.55" />

      {/* Label top rule */}
      <line x1="103" y1="209" x2="197" y2="209"
            stroke={c.accent} strokeWidth="0.5" strokeOpacity="0.5" />
      {/* Label bottom rule */}
      <line x1="103" y1="256" x2="197" y2="256"
            stroke={c.accent} strokeWidth="0.5" strokeOpacity="0.5" />

      {/* Label distillery name */}
      <text x="150" y="230" textAnchor="middle" fontSize="8.5" fontWeight="bold"
            fontFamily="Georgia, 'Times New Roman', serif" letterSpacing="0.8"
            fill={c.bottleDark} fillOpacity="0.9">
        {labelText.toUpperCase()}
      </text>

      {/* Label category */}
      <text x="150" y="248" textAnchor="middle" fontSize="6.5"
            fontFamily="Georgia, 'Times New Roman', serif" letterSpacing="0.4"
            fill={c.bottleDark} fillOpacity="0.7">
        {catLabel.toUpperCase().slice(0, 22)}
      </text>

      {/* Neck label */}
      <rect x="130" y="54" width="40" height="20" rx="2"
            fill={c.label} fillOpacity="0.65" />

      {/* Cork / Cap */}
      <rect x="136" y="24" width="28" height="11" rx="3"
            fill={c.accent} fillOpacity="0.88" />
      <rect x="138" y="26" width="24" height="2"
            fill="white" fillOpacity="0.18" />

      {/* Bottom shadow */}
      <ellipse cx="150" cy="336" rx="60" ry="7"
               fill="black" fillOpacity="0.38" />
    </svg>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

interface ProductCardProps {
  product: SearchResult;
}

export function ProductCard({ product }: ProductCardProps) {
  const bp = product.bestPrice;
  const sym = bp ? (CURRENCY_SYMBOLS[bp.currency] ?? bp.currency + ' ') : '';
  const [imgError, setImgError] = useState(false);

  const categoryLabel = product.category
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? 'Whisky';

  return (
    <div
      className="product-card group flex flex-col rounded-xl overflow-hidden"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
      }}
    >
      <Link href={`/products/${product.id}`} className="flex flex-col flex-1" style={{ textDecoration: 'none', color: 'inherit' }}>
      {/* Image area */}
      <div className="relative overflow-hidden" style={{ height: 224 }}>
        {product.imageUrl && !imgError ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={proxyImageUrl(product.imageUrl)}
            alt={product.name}
            onError={() => setImgError(true)}
            className="h-full w-full object-contain p-5 transition-transform duration-500 group-hover:scale-105"
            style={{ background: 'linear-gradient(180deg, #111 0%, #1a1008 100%)' }}
          />
        ) : (
          /* SVG bottle illustration — always available, zero external deps */
          <div className="h-full w-full transition-transform duration-500 group-hover:scale-105">
            <WhiskyBottleSVG
              distillery={product.distillery}
              category={product.category}
              region={product.region ?? null}
            />
          </div>
        )}

        {/* Category label overlay on the SVG placeholder */}
        {(!product.imageUrl || imgError) && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.55) 100%)' }}
          >
            <div className="absolute bottom-6 left-0 right-0 flex flex-col items-center gap-0.5">
              <span
                className="text-xs font-bold tracking-widest uppercase"
                style={{ color: 'rgba(255,255,255,0.45)', textShadow: '0 1px 4px rgba(0,0,0,0.9)' }}
              >
                {categoryLabel}
              </span>
            </div>
          </div>
        )}

        {/* Price badge */}
        {bp?.inStock && (
          <span
            className="absolute left-2.5 top-2.5 flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold shadow-lg"
            style={{ background: 'var(--primary)', color: '#0A0A0A' }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 12, fontVariationSettings: "'FILL' 1" }}>trending_down</span>
            {sym}{bp.priceLocal.toFixed(0)}
          </span>
        )}

        {/* Country flag */}
        {bp && (
          <span
            className="absolute right-2.5 top-2.5 rounded-lg px-2 py-1 text-xs font-medium"
            style={{ background: 'rgba(0,0,0,0.65)', color: 'var(--text-muted)', backdropFilter: 'blur(4px)' }}
          >
            {COUNTRY_FLAG[bp.retailerCountry] ?? bp.currency}
          </span>
        )}

        {/* Cart button — hover */}
        <div
          className="absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100"
          style={{
            background: 'var(--primary)',
            boxShadow: '0 4px 12px rgba(212,168,83,0.4)',
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: '#0A0A0A', fontVariationSettings: "'FILL' 1" }}>
            shopping_bag
          </span>
        </div>

        {/* Bottom gradient */}
        <div
          className="absolute bottom-0 left-0 right-0 h-12 pointer-events-none"
          style={{ background: 'linear-gradient(to top, var(--surface), transparent)' }}
        />
      </div>

      {/* Info */}
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-widest truncate" style={{ color: 'var(--text-muted)' }}>
          {product.distillery}
        </p>
        <h3 className="mt-1 text-sm font-semibold leading-snug line-clamp-2" style={{ color: 'var(--text)' }}>
          {product.name}
        </h3>

        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {product.ageYears && <Chip>{product.ageYears}yr</Chip>}
          {product.abv && <Chip>{product.abv}%</Chip>}
          {product.region && <Chip>{product.region}</Chip>}
          <Chip>{product.volumeMl}ml</Chip>
        </div>

        <div className="mt-auto pt-4">
          {bp ? (
            <div className="flex items-end justify-between">
              <div>
                <p
                  className="text-xl font-bold leading-none"
                  style={{ color: 'var(--primary)', fontFamily: 'Playfair Display, serif' }}
                >
                  {sym}{bp.priceLocal.toFixed(2)}
                </p>
                <p className="mt-1 text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: bp.inStock ? 'var(--green)' : 'var(--text-muted)', fontSize: 8 }}>●</span>
                  {bp.inStock ? 'In stock' : 'Out of stock'}
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span className="truncate" style={{ maxWidth: 90 }}>{bp.retailerName}</span>
                </p>
              </div>
            </div>
          ) : (
            <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>Price unavailable</p>
          )}
        </div>
      </div>
      </Link>

      {/* Buy now button — outside <Link> to avoid nested <a> tags */}
      {bp?.sourceUrl && bp.inStock && (
        <div className="px-4 pb-4 pt-2">
          <a
            href={bp.sourceUrl}
            target="_blank"
            rel="noopener noreferrer sponsored"
            onClick={(e) => e.stopPropagation()}
            className="flex w-full items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-opacity hover:opacity-80"
            style={{
              background: 'var(--primary)',
              color: '#0A0A0A',
              textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14, fontVariationSettings: "'FILL' 1" }}>
              shopping_bag
            </span>
            Buy at {bp.retailerName}
          </a>
        </div>
      )}
    </div>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="rounded-md px-2 py-0.5 text-xs font-medium"
      style={{
        background: 'var(--surface-elevated)',
        border: '1px solid var(--border)',
        color: 'var(--text-subtle)',
      }}
    >
      {children}
    </span>
  );
}
