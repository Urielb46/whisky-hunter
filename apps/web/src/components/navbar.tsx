'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Heart, Bell, User, LogOut, ChevronDown, Menu, X } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [q, setQ] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 50);
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = q.trim();
    if (!trimmed) return;
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    setMenuOpen(false);
  }

  const isSearchPage = pathname !== '/';

  return (
    <header
      className="glass-nav"
      style={{
        background: scrolled ? 'rgba(10,10,10,0.95)' : 'rgba(10,10,10,0.6)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        transition: 'background 0.3s ease',
      }}
    >
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex h-20 items-center gap-10">
          {/* Logo */}
          <Link
            href="/"
            className="flex shrink-0 items-center gap-2"
          >
            <span
              className="material-symbols-outlined"
              style={{
                color: 'var(--primary)',
                fontSize: 28,
                fontVariationSettings: "'FILL' 1",
              }}
            >
              liquor
            </span>
            <span
              className="text-xl font-bold hidden sm:block"
              style={{
                fontFamily: 'Playfair Display, serif',
                color: 'var(--primary)',
                letterSpacing: '0.08em',
              }}
            >
              WHISKYHUNTER
            </span>
          </Link>

          {/* Nav links — desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {[
              { label: 'Browse', href: '/search?q=' },
              { label: 'Regions', href: '/search?region=Speyside' },
              { label: 'Distilleries', href: '/search?q=distillery' },
            ].map(({ label, href }) => {
              const active = pathname.startsWith('/search');
              return (
                <Link
                  key={label}
                  href={href}
                  className="text-xs font-bold uppercase tracking-widest transition-colors duration-200 hover:text-amber-400 pb-0.5"
                  style={{
                    color: active && label === 'Browse' ? 'var(--primary)' : 'var(--text-muted)',
                    borderBottom: active && label === 'Browse' ? '2px solid var(--primary)' : '2px solid transparent',
                  }}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Search bar — non-home pages */}
          {isSearchPage && (
            <form onSubmit={handleSearch} className="hidden flex-1 sm:flex" style={{ maxWidth: 420 }}>
              <div
                className="flex w-full items-center gap-2 rounded-lg px-4 py-2.5"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  backdropFilter: 'blur(8px)',
                  transition: 'border-color 0.2s',
                }}
              >
                <span className="material-symbols-outlined" style={{ color: 'var(--text-muted)', fontSize: 20 }}>search</span>
                <input
                  type="search"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search distillery, age, or region..."
                  className="w-full bg-transparent text-sm outline-none"
                  style={{ color: 'var(--text)' }}
                />
              </div>
            </form>
          )}

          <div className="ml-auto flex items-center gap-3">
            {/* Wishlist */}
            {user && (
              <Link href="/wishlist" className="rounded-lg p-2 transition-colors hover:bg-white/5" title="Wishlist">
                <Heart size={18} style={{ color: pathname === '/wishlist' ? 'var(--primary)' : 'var(--text-subtle)' }} />
              </Link>
            )}

            {/* Alerts */}
            {user?.tier === 'premium' && (
              <Link href="/alerts" className="rounded-lg p-2 transition-colors hover:bg-white/5" title="Price Alerts">
                <Bell size={18} style={{ color: pathname === '/alerts' ? 'var(--primary)' : 'var(--text-subtle)' }} />
              </Link>
            )}

            {/* Auth */}
            {!user ? (
              <div className="flex items-center gap-4">
                <Link
                  href="/auth/login"
                  className="hidden sm:block text-xs font-bold uppercase tracking-widest transition-colors hover:text-amber-400"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Sign In
                </Link>
                <Link
                  href="/auth/signup"
                  className="rounded px-5 py-2 text-xs font-bold uppercase tracking-widest transition-all active:scale-95 hover:opacity-90"
                  style={{ background: 'var(--primary)', color: '#0A0A0A' }}
                >
                  Register
                </Link>
              </div>
            ) : (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen((v) => !v)}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-white/5"
                >
                  <div
                    className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                    style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}
                  >
                    {user.name?.[0]?.toUpperCase() ?? <User size={14} />}
                  </div>
                  <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
                </button>

                {userMenuOpen && (
                  <div
                    className="absolute right-0 mt-1 w-52 rounded-xl py-1"
                    style={{
                      background: 'var(--surface-elevated)',
                      border: '1px solid var(--border)',
                      boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div className="px-4 py-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{user.name}</p>
                      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      {user.tier === 'premium' && (
                        <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold" style={{ background: 'var(--primary-muted)', color: 'var(--primary)' }}>
                          Premium
                        </span>
                      )}
                    </div>
                    <Link href="/account" className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: 'var(--text-subtle)' }} onClick={() => setUserMenuOpen(false)}>
                      <User size={14} /> Account
                    </Link>
                    <Link href="/wishlist" className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: 'var(--text-subtle)' }} onClick={() => setUserMenuOpen(false)}>
                      <Heart size={14} /> Wishlist
                    </Link>
                    {user.tier === 'free' && (
                      <Link href="/premium" className="flex items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-white/5" style={{ color: 'var(--primary)' }} onClick={() => setUserMenuOpen(false)}>
                        ✦ Upgrade to Premium
                      </Link>
                    )}
                    <div style={{ borderTop: '1px solid var(--border)' }} className="mt-1 pt-1">
                      <button
                        onClick={async () => { await logout(); setUserMenuOpen(false); router.push('/'); }}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-sm transition-colors hover:bg-white/5"
                        style={{ color: 'var(--text-muted)' }}
                      >
                        <LogOut size={14} /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Mobile menu toggle */}
            <button
              className="ml-1 rounded-lg p-2 md:hidden transition-colors hover:bg-white/5"
              onClick={() => setMenuOpen((v) => !v)}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="pb-4 md:hidden border-t" style={{ borderColor: 'var(--border)' }}>
            <form onSubmit={handleSearch} className="flex gap-2 py-3">
              <input
                type="search"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search whiskies…"
                className="flex-1 rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text)' }}
              />
              <button type="submit" className="rounded-lg px-4 py-2 text-sm font-semibold" style={{ background: 'var(--primary)', color: '#0A0A0A' }}>
                Search
              </button>
            </form>
            <div className="flex gap-6 pb-3">
              <Link href="/search?q=" className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }} onClick={() => setMenuOpen(false)}>Browse</Link>
              <Link href="/search?region=Speyside" className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }} onClick={() => setMenuOpen(false)}>Regions</Link>
            </div>
            {!user && (
              <div className="flex gap-2">
                <Link href="/auth/login" className="flex-1 rounded-lg py-2 text-center text-sm font-medium" style={{ background: 'var(--surface-elevated)', color: 'var(--text)' }} onClick={() => setMenuOpen(false)}>Sign in</Link>
                <Link href="/auth/signup" className="flex-1 rounded-lg py-2 text-center text-sm font-semibold" style={{ background: 'var(--primary)', color: '#0A0A0A' }} onClick={() => setMenuOpen(false)}>Sign up</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
}
