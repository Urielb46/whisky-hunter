import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | WhiskyHunter',
  description: 'How WhiskyHunter collects, uses, and protects your personal data.',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
      >
        Privacy Policy
      </h1>
      <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
        Last updated: 27 May 2025 · Effective: 27 May 2025
      </p>

      <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--text)' }}>

        <section>
          <h2 className="text-lg font-semibold mb-3">1. Who we are</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            WhiskyHunter (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) is a price-comparison service for whisky
            buyers worldwide. Our registered contact email is{' '}
            <a href="mailto:privacy@whiskyhunter.com" style={{ color: 'var(--primary)' }}>
              privacy@whiskyhunter.com
            </a>.
          </p>
          <p className="mt-2" style={{ color: 'var(--text-muted)' }}>
            This policy applies to our website (whiskyhunter.com), mobile applications, and related
            services (collectively, the &ldquo;Service&rdquo;). We act as the data controller under the UK GDPR
            and EU GDPR.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Data we collect</h2>
          <div style={{ color: 'var(--text-muted)' }}>
            <p className="font-medium mb-2" style={{ color: 'var(--text)' }}>Account data</p>
            <p>Name, email address, and hashed password when you register. If you sign in with Google, we receive your name and email from Google.</p>

            <p className="font-medium mt-4 mb-2" style={{ color: 'var(--text)' }}>Usage data</p>
            <p>Search queries, product views, wishlist items, and price alert configurations. We use this to improve search relevance and send requested notifications.</p>

            <p className="font-medium mt-4 mb-2" style={{ color: 'var(--text)' }}>Technical data</p>
            <p>IP address, browser type, device identifiers, and session tokens (stored in HttpOnly cookies). We use these for security and to maintain your session.</p>

            <p className="font-medium mt-4 mb-2" style={{ color: 'var(--text)' }}>Payment data</p>
            <p>We use Stripe to process payments. We do not store your card details — Stripe handles all payment data under their own privacy policy. We store your subscription status and Stripe customer ID.</p>

            <p className="font-medium mt-4 mb-2" style={{ color: 'var(--text)' }}>Push notification tokens</p>
            <p>If you enable push notifications on our mobile app, we store your Expo push token to deliver price alerts.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Legal basis for processing</h2>
          <div style={{ color: 'var(--text-muted)' }}>
            <p>We process your data under the following legal bases (UK GDPR Art. 6):</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong style={{ color: 'var(--text)' }}>Contract</strong> — to provide the Service you signed up for (search, alerts, wishlists).</li>
              <li><strong style={{ color: 'var(--text)' }}>Legitimate interests</strong> — to improve the Service, prevent fraud, and maintain security.</li>
              <li><strong style={{ color: 'var(--text)' }}>Consent</strong> — for push notifications (you can withdraw at any time in app settings).</li>
              <li><strong style={{ color: 'var(--text)' }}>Legal obligation</strong> — to comply with applicable laws including age-verification requirements for alcohol content.</li>
            </ul>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. How we use your data</h2>
          <ul className="space-y-1 list-disc list-inside" style={{ color: 'var(--text-muted)' }}>
            <li>Provide search results, price comparisons, and true-cost calculations.</li>
            <li>Send price alerts and wishlist notifications you have requested.</li>
            <li>Process subscription payments through Stripe.</li>
            <li>Enforce daily search limits and tier-based feature access.</li>
            <li>Verify that users are of legal drinking age in their jurisdiction.</li>
            <li>Investigate and prevent fraud, abuse, or violations of our Terms of Service.</li>
          </ul>
          <p className="mt-3" style={{ color: 'var(--text-muted)' }}>
            We do not sell your personal data. We do not use your data for advertising profiling.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Data sharing</h2>
          <div style={{ color: 'var(--text-muted)' }}>
            <p>We share data only with:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong style={{ color: 'var(--text)' }}>Stripe</strong> — payment processing (USA, Privacy Shield successor framework).</li>
              <li><strong style={{ color: 'var(--text)' }}>Resend</strong> — transactional email delivery.</li>
              <li><strong style={{ color: 'var(--text)' }}>Expo</strong> — push notification delivery for mobile apps.</li>
              <li><strong style={{ color: 'var(--text)' }}>Railway / Vercel</strong> — cloud hosting infrastructure.</li>
            </ul>
            <p className="mt-3">
              All sub-processors are subject to data processing agreements. We do not transfer data
              to third countries without appropriate safeguards (Standard Contractual Clauses or
              adequacy decisions).
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Data retention</h2>
          <ul className="space-y-1 list-disc list-inside" style={{ color: 'var(--text-muted)' }}>
            <li>Account data: retained while your account is active, deleted within 30 days of account deletion request.</li>
            <li>Price snapshots and search history: anonymised after 90 days.</li>
            <li>Billing records: retained for 7 years to comply with UK tax law.</li>
            <li>Session cookies: expire after 30 days of inactivity.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Your rights</h2>
          <div style={{ color: 'var(--text-muted)' }}>
            <p>Under UK GDPR and EU GDPR you have the right to:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Access a copy of the personal data we hold about you.</li>
              <li>Correct inaccurate data.</li>
              <li>Erasure (&ldquo;right to be forgotten&rdquo;) — subject to legal retention obligations.</li>
              <li>Restrict or object to processing.</li>
              <li>Data portability — receive your data in a machine-readable format.</li>
              <li>Withdraw consent (e.g. push notifications) at any time without affecting prior lawful processing.</li>
            </ul>
            <p className="mt-3">
              To exercise any right, email{' '}
              <a href="mailto:privacy@whiskyhunter.com" style={{ color: 'var(--primary)' }}>
                privacy@whiskyhunter.com
              </a>. We will respond within 30 days. You also have the right to lodge a complaint
              with the UK Information Commissioner&apos;s Office (ICO) at{' '}
              <a href="https://ico.org.uk" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                ico.org.uk
              </a>.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Cookies</h2>
          <div style={{ color: 'var(--text-muted)' }}>
            <p>We use the following cookies:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li><strong style={{ color: 'var(--text)' }}>session</strong> (HttpOnly, Secure) — authentication session token. Essential; no consent required.</li>
              <li><strong style={{ color: 'var(--text)' }}>age_confirmed</strong> (HttpOnly) — records that you have confirmed you are of legal age. Essential for legal compliance.</li>
              <li><strong style={{ color: 'var(--text)' }}>wh_theme</strong> — stores your light/dark mode preference. Functional; no consent required.</li>
            </ul>
            <p className="mt-3">We do not use advertising or third-party tracking cookies.</p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Security</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            We use TLS in transit, bcrypt password hashing, HttpOnly session cookies, and
            parameterised database queries. Access to production systems is restricted to
            authorised personnel.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Changes to this policy</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            We may update this policy. Material changes will be notified by email to registered
            users at least 14 days before taking effect. The &ldquo;Last updated&rdquo; date above
            reflects the most recent revision.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">11. Contact</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            For privacy questions, requests, or complaints, contact our Data Protection Officer at{' '}
            <a href="mailto:privacy@whiskyhunter.com" style={{ color: 'var(--primary)' }}>
              privacy@whiskyhunter.com
            </a>.
          </p>
        </section>

      </div>
    </div>
  );
}
