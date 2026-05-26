import { SearchForm } from '@/components/search-form';
import { ProductCard } from '@/components/product-card';
import { searchWhisky } from '@/lib/api';

async function getFeatured() {
  try {
    const data = await searchWhisky({ q: 'macallan', limit: 4 });
    if (data.results.length) return data.results.slice(0, 4);
    const fallback = await searchWhisky({ q: 'scotch', limit: 4 });
    return fallback.results.slice(0, 4);
  } catch {
    return [];
  }
}

const REGIONS = [
  {
    name: 'Speyside',
    desc: 'Fruity & elegant, home to over half Scotland\'s distilleries',
    img: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&auto=format&fit=crop&q=70&crop=left',
  },
  {
    name: 'Islay',
    desc: 'Bold peaty drams with powerful coastal character',
    img: 'https://images.unsplash.com/photo-1551632436-cbf8dd35adfa?w=600&auto=format&fit=crop&q=70',
  },
  {
    name: 'Highland',
    desc: 'Rich, diverse expressions across vast terrain',
    img: 'https://images.unsplash.com/photo-1508739773434-c26b3d09e071?w=600&auto=format&fit=crop&q=70',
  },
  {
    name: 'Lowland',
    desc: 'Light, floral and approachable whiskies',
    img: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&auto=format&fit=crop&q=70',
  },
  {
    name: 'Campbeltown',
    desc: 'Maritime, briny and distinctively complex',
    img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=70',
  },
  {
    name: 'Islands',
    desc: 'Wild coastal character and smoky elegance',
    img: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&auto=format&fit=crop&q=70',
  },
];

const QUICK_SEARCHES = [
  { label: 'Single Malt', q: 'single malt scotch' },
  { label: 'Islay Peat', q: 'lagavulin ardbeg' },
  { label: 'Bourbon', q: 'bourbon' },
  { label: 'Japanese', q: 'japanese whisky' },
  { label: 'Age 18+', q: '18 year' },
  { label: 'Cask Strength', q: 'cask strength' },
  { label: 'Irish', q: 'irish whiskey' },
  { label: 'World Whisky', q: 'kavalan amrut' },
];

export default async function HomePage() {
  const featured = await getFeatured();

  return (
    <div>
      {/* ── Hero ── */}
      <section
        className="relative flex flex-col overflow-hidden rounded-2xl mb-6"
        style={{ minHeight: '88vh' }}
      >
        {/* Background image */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&auto=format&fit=crop&q=75)',
            backgroundSize: 'cover',
            backgroundPosition: 'center 35%',
          }}
        />
        {/* Bottom gradient */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.4) 40%, rgba(10,10,10,0.75) 80%, rgba(10,10,10,0.97) 100%)',
          }}
        />
        {/* Left gradient */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'linear-gradient(to right, rgba(10,10,10,0.75) 0%, rgba(10,10,10,0.2) 60%, transparent 100%)',
          }}
        />
        {/* Amber radial glow */}
        <div
          aria-hidden
          className="animate-glow pointer-events-none absolute"
          style={{
            top: -80, left: '30%',
            width: 700, height: 500,
            background: 'radial-gradient(ellipse at center, rgba(212,168,83,0.12) 0%, transparent 65%)',
          }}
        />

        {/* Content */}
        <div className="relative flex flex-1 items-center">
          <div className="mx-auto w-full max-w-7xl px-6 py-24">
            <div style={{ maxWidth: 640 }}>
              {/* Badge */}
              <p
                className="animate-fade-in-up-1 mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid rgba(212,168,83,0.2)' }}
              >
                <span>✦</span> The Authoritative Spirit Market Index
              </p>

              <h1
                className="animate-fade-in-up-2 font-bold leading-tight"
                style={{
                  fontFamily: 'Playfair Display, serif',
                  color: 'var(--text)',
                  fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                  lineHeight: 1.1,
                }}
              >
                Find any whisky.{' '}
                <span className="shimmer-text">Pay the right price.</span>
              </h1>

              <p
                className="animate-fade-in-up-3 mt-6 text-base sm:text-lg"
                style={{ color: 'var(--text-muted)', maxWidth: 520, lineHeight: 1.7 }}
              >
                True all-in cost — shelf price, shipping, import duties, and currency conversion —
                compared across retailers worldwide, updated daily.
              </p>

              {/* Glass search bar */}
              <div className="animate-fade-in-up-4 mt-10 w-full max-w-lg">
                <div
                  className="rounded-xl p-1"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <SearchForm large />
                </div>
              </div>

              {/* Quick searches */}
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="text-xs" style={{ color: 'var(--text-muted)', alignSelf: 'center' }}>Try:</span>
                {QUICK_SEARCHES.map(({ label, q }) => (
                  <a
                    key={q}
                    href={`/search?q=${encodeURIComponent(q)}`}
                    className="quick-pill rounded-full px-3 py-1 text-xs font-medium"
                    style={{
                      background: 'rgba(255,255,255,0.07)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: 'var(--text-subtle)',
                    }}
                  >
                    {label}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom stats strip */}
        <div
          className="relative"
          style={{
            background: 'rgba(10,10,10,0.85)',
            backdropFilter: 'blur(12px)',
            borderTop: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          <div className="mx-auto max-w-7xl px-6">
            <div className="grid grid-cols-3" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[
                { value: '200k+', label: 'Bottles Tracked' },
                { value: '10+', label: 'Global Retailers' },
                { value: '40+', label: 'Shipping Zones' },
              ].map(({ value, label }) => (
                <div key={label} className="group flex flex-col items-center py-5 px-4 text-center">
                  <span
                    className="text-2xl font-bold transition-transform duration-300 group-hover:scale-110"
                    style={{ color: 'var(--primary)', fontFamily: 'Playfair Display, serif' }}
                  >
                    {value}
                  </span>
                  <span
                    className="mt-1 text-xs font-medium uppercase"
                    style={{ color: 'var(--text-muted)', letterSpacing: '0.2em' }}
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured / Market Picks ── */}
      {featured.length > 0 && (
        <section className="mb-16">
          <div className="mb-8 flex items-end justify-between">
            <div>
              <p className="mb-1 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
                Market Picks
              </p>
              <h2
                className="text-2xl font-bold sm:text-3xl"
                style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
              >
                Trending Distillations
              </h2>
            </div>
            <a
              href="/search?q=scotch"
              className="flex items-center gap-1.5 text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--primary)' }}
            >
              View Market Index
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span>
            </a>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}

      {/* ── Regional Excellence ── */}
      <section className="mb-16 -mx-4 sm:-mx-6 px-4 sm:px-6 py-16" style={{ background: 'var(--surface)' }}>
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
              Explore Scotland
            </p>
            <h2
              className="text-2xl font-bold sm:text-3xl"
              style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
            >
              Regional Excellence
            </h2>
            <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
              The terroir of Scotland, expressed in every dram
            </p>
          </div>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            {REGIONS.map(({ name, desc, img }) => (
              <a
                key={name}
                href={`/search?region=${encodeURIComponent(name)}`}
                className="region-card group relative overflow-hidden rounded-xl"
                style={{
                  border: '1px solid rgba(212,168,83,0.15)',
                  aspectRatio: '3 / 4',
                }}
              >
                {/* Grayscale base layer */}
                <div
                  className="absolute inset-0 transition-opacity duration-700 group-hover:opacity-0"
                  style={{
                    backgroundImage: `url(${img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'grayscale(1) brightness(0.55)',
                  }}
                />
                {/* Color layer on hover */}
                <div
                  className="absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100"
                  style={{
                    backgroundImage: `url(${img})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    filter: 'brightness(0.65)',
                  }}
                />
                {/* Scrim */}
                <div className="region-card-scrim absolute inset-0" />

                {/* Text — slides up on hover */}
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <span
                    className="block text-sm font-bold"
                    style={{ color: '#F0EDE8', fontFamily: 'Playfair Display, serif' }}
                  >
                    {name}
                  </span>
                  <span
                    className="mt-1 block text-xs leading-relaxed opacity-0 translate-y-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-y-0"
                    style={{ color: 'rgba(240,237,232,0.75)' }}
                  >
                    {desc}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mb-16">
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--primary)' }}>
            Simple Process
          </p>
          <h2
            className="text-2xl font-bold sm:text-3xl"
            style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
          >
            How WhiskyHunter Works
          </h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              step: '01',
              icon: 'search',
              title: 'Search any whisky',
              desc: 'Find any expression — Macallan 18, Lagavulin 16, Blanton\'s — across our full global catalog.',
            },
            {
              step: '02',
              icon: 'balance',
              title: 'See the true cost',
              desc: 'We calculate duties, VAT, currency conversion, and shipping so you see the real delivered price.',
            },
            {
              step: '03',
              icon: 'shopping_bag',
              title: 'Buy at the best price',
              desc: 'Click through to the retailer. Set price alerts to catch drops. Never overpay again.',
            },
          ].map(({ step, icon, title, desc }) => (
            <div
              key={step}
              className="step-card relative overflow-hidden rounded-xl p-10"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}
            >
              {/* Watermark number */}
              <div
                className="pointer-events-none absolute right-4 top-4 select-none font-bold"
                style={{
                  color: 'var(--primary)',
                  opacity: 0.06,
                  fontFamily: 'Playfair Display, serif',
                  fontSize: 140,
                  lineHeight: 1,
                }}
              >
                {step}
              </div>
              <div className="relative">
                <span
                  className="material-symbols-outlined mb-5 block"
                  style={{ color: 'var(--primary)', fontSize: 32 }}
                >
                  {icon}
                </span>
                <h3 className="mb-3 text-base font-semibold" style={{ color: 'var(--text)' }}>{title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="mb-16">
        <div
          className="relative overflow-hidden rounded-2xl px-8 py-16 text-center"
          style={{
            background: 'linear-gradient(135deg, #1a1008 0%, #2d1f0a 50%, #1a1008 100%)',
            border: '1px solid rgba(212,168,83,0.25)',
          }}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(212,168,83,0.18) 0%, transparent 60%)' }}
          />
          <div className="relative">
            <p
              className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-widest"
              style={{ background: 'var(--primary-muted)', color: 'var(--primary)', border: '1px solid rgba(212,168,83,0.2)' }}
            >
              <span>✦</span> Member Access
            </p>
            <h2
              className="text-2xl font-bold sm:text-3xl"
              style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
            >
              Ready to find your next masterpiece?
            </h2>
            <p className="mt-4 text-sm" style={{ color: 'var(--text-muted)', maxWidth: 480, margin: '1rem auto 0' }}>
              Join thousands of whisky enthusiasts comparing prices globally. Free account, no credit card.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
              <a
                href="/search?q=single malt scotch"
                className="rounded-xl px-8 py-3 text-sm font-bold transition-all hover:opacity-90 active:scale-95"
                style={{
                  background: 'var(--primary)',
                  color: '#0A0A0A',
                  boxShadow: '0 0 24px rgba(212,168,83,0.35)',
                }}
              >
                Start Exploring
              </a>
              <a
                href="/auth/signup"
                className="rounded-xl px-8 py-3 text-sm font-medium transition-colors hover:bg-white/5"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
              >
                Create Free Account
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
