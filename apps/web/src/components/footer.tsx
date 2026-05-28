import Link from 'next/link';

export function Footer() {
  return (
    <footer
      className="mt-24"
      style={{ borderTop: '1px solid var(--border)' }}
    >
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-3">
          {/* Brand */}
          <div>
            <p className="text-lg font-bold text-gold" style={{ fontFamily: 'Playfair Display, serif' }}>
              🥃 WhiskyHunter
            </p>
            <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)', maxWidth: 240 }}>
              Compare whisky prices across global retailers. True all-in cost — duties, taxes, shipping included.
            </p>
          </div>

          {/* Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Explore</p>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
              <li><Link href="/search?q=scotch" className="hover:text-amber-400 transition-colors">Scotch Whisky</Link></li>
              <li><Link href="/search?q=bourbon" className="hover:text-amber-400 transition-colors">Bourbon</Link></li>
              <li><Link href="/search?q=japanese" className="hover:text-amber-400 transition-colors">Japanese Whisky</Link></li>
              <li><Link href="/search?q=irish" className="hover:text-amber-400 transition-colors">Irish Whiskey</Link></li>
            </ul>
          </div>

          {/* Account + Legal */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--text-muted)' }}>Account</p>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
              <li><Link href="/auth/signup" className="hover:text-amber-400 transition-colors">Create account</Link></li>
              <li><Link href="/wishlist" className="hover:text-amber-400 transition-colors">Wishlist</Link></li>
              <li><Link href="/alerts" className="hover:text-amber-400 transition-colors">Price Alerts</Link></li>
              <li><Link href="/premium" className="hover:text-amber-400 transition-colors">Premium</Link></li>
            </ul>
            <p className="text-xs font-semibold uppercase tracking-widest mb-3 mt-6" style={{ color: 'var(--text-muted)' }}>Legal</p>
            <ul className="space-y-2 text-sm" style={{ color: 'var(--text-subtle)' }}>
              <li><Link href="/privacy" className="hover:text-amber-400 transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms" className="hover:text-amber-400 transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div
          className="mt-10 flex flex-col items-center justify-between gap-3 pt-6 text-xs sm:flex-row"
          style={{ borderTop: '1px solid var(--border)', color: 'var(--text-muted)' }}
        >
          <p>© {new Date().getFullYear()} WhiskyHunter. Prices updated daily — always verify before purchase.</p>
          <p className="font-medium" style={{ color: 'var(--text-subtle)' }}>
            🔞 Must be 21+ to purchase alcohol. Please drink responsibly.
          </p>
        </div>
      </div>
    </footer>
  );
}
