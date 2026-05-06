import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WhiskyHunter — Find the best whisky price worldwide',
  description:
    'Compare whisky prices across global retailers. See the true all-in cost including shipping, duties, and taxes.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-stone-950 text-stone-100 antialiased">
        <header className="border-b border-stone-800 px-6 py-4">
          <a href="/" className="text-xl font-bold tracking-tight text-amber-400">
            🥃 WhiskyHunter
          </a>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
        <footer className="mt-16 border-t border-stone-800 px-6 py-6 text-center text-sm text-stone-500">
          WhiskyHunter — prices updated daily. Always verify before purchase.
        </footer>
      </body>
    </html>
  );
}
