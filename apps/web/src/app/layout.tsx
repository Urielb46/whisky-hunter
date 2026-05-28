import type { Metadata } from 'next';
import './globals.css';
import { Navbar } from '@/components/navbar';
import { Footer } from '@/components/footer';
import { AgeGateModal } from '@/components/age-gate-modal';
import { CookieConsent } from '@/components/cookie-consent';
import { Providers } from '@/lib/providers';

export const metadata: Metadata = {
  title: 'WhiskyHunter — Find the best whisky price worldwide',
  description:
    'Compare whisky prices across global retailers. See the true all-in cost including shipping, duties, and taxes.',
  keywords: 'whisky, whiskey, price comparison, scotch, bourbon, single malt',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>
          <AgeGateModal />
          <CookieConsent />
          <Navbar />
          <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
            {children}
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
