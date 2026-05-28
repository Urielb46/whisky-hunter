import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | WhiskyHunter',
  description: 'Terms and conditions for using the WhiskyHunter price comparison service.',
};

export default function TermsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      <h1
        className="text-3xl font-bold mb-2"
        style={{ fontFamily: 'Playfair Display, serif', color: 'var(--text)' }}
      >
        Terms of Service
      </h1>
      <p className="text-sm mb-10" style={{ color: 'var(--text-muted)' }}>
        Last updated: 27 May 2025 · Effective: 27 May 2025
      </p>

      <div className="space-y-8 text-sm leading-relaxed" style={{ color: 'var(--text)' }}>

        <section>
          <h2 className="text-lg font-semibold mb-3">1. Acceptance of terms</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            By accessing or using WhiskyHunter (&ldquo;Service&rdquo;), you agree to be bound by these Terms of
            Service (&ldquo;Terms&rdquo;). If you do not agree, do not use the Service. These Terms form a legally
            binding agreement between you and WhiskyHunter.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">2. Age requirement</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            You must be of legal drinking age in your country of residence to use this Service.
            The minimum age is 18 in the United Kingdom and European Union, and 21 in the United States.
            By confirming your age, you represent that you meet this requirement. We reserve the right
            to terminate accounts where age misrepresentation is suspected.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">3. Service description</h2>
          <div style={{ color: 'var(--text-muted)' }}>
            <p>
              WhiskyHunter is a price-comparison and information service. We aggregate publicly
              available prices from third-party retailers. We do not sell alcohol directly.
            </p>
            <p className="mt-2">
              Prices, availability, and shipping information shown on WhiskyHunter are for
              informational purposes only. We do not guarantee their accuracy. Prices and
              availability may differ on the retailer&apos;s website. Always verify before purchasing.
            </p>
            <p className="mt-2">
              The True Cost Calculator provides duty, tax, and shipping estimates based on publicly
              available rate tables. These are estimates only and do not constitute tax or customs
              advice. Actual costs may vary.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">4. User accounts</h2>
          <div style={{ color: 'var(--text-muted)' }}>
            <p>You are responsible for maintaining the security of your account credentials. You must not:</p>
            <ul className="mt-2 space-y-1 list-disc list-inside">
              <li>Share your account with others.</li>
              <li>Use automated tools to access the Service beyond normal use.</li>
              <li>Circumvent any rate limits or access controls.</li>
              <li>Attempt to access other users&apos; data.</li>
            </ul>
            <p className="mt-3">
              We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">5. Free and Premium tiers</h2>
          <div style={{ color: 'var(--text-muted)' }}>
            <p><strong style={{ color: 'var(--text)' }}>Free tier</strong> includes: up to 50 searches per day, price comparison, true-cost calculator, and a Wishlist of up to 10 items.</p>
            <p className="mt-2"><strong style={{ color: 'var(--text)' }}>Premium tier</strong> adds: unlimited searches, unlimited price alerts with email and push notifications, and unlimited Wishlist.</p>
            <p className="mt-2">
              Premium subscriptions are billed monthly ($9.99/mo) or annually ($89.99/yr) via Stripe.
              You may cancel at any time; access continues until the end of the billing period.
              No refunds are issued for partial periods.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">6. Cross-border purchasing</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            Importing alcohol across national borders may be subject to customs duties, excise taxes,
            import restrictions, or outright prohibition depending on your destination country. It is
            your responsibility to comply with the laws of your jurisdiction. WhiskyHunter provides
            information about restrictions where known, but this information may be incomplete or
            out of date. We accept no liability for customs seizures, fines, or legal consequences
            arising from cross-border alcohol purchases.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">7. Intellectual property</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            The WhiskyHunter name, logo, and original content are owned by WhiskyHunter. Product
            names, distillery names, and scores are the property of their respective owners.
            Whiskybase scores and ratings are used with attribution and are the property of
            Whiskybase BV.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">8. Disclaimer of warranties</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            The Service is provided &ldquo;as is&rdquo; without warranties of any kind. We do not warrant
            that prices, availability, or duty estimates are accurate, complete, or current.
            Your use of information from this Service is entirely at your own risk.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">9. Limitation of liability</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            To the maximum extent permitted by law, WhiskyHunter shall not be liable for any
            indirect, incidental, or consequential damages arising from your use of the Service,
            including losses arising from reliance on price or duty information. Our total
            liability to you shall not exceed the amount you paid us in the 12 months
            preceding the claim.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">10. Governing law</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            These Terms are governed by the laws of England and Wales. Any disputes shall be
            subject to the exclusive jurisdiction of the courts of England and Wales.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">11. Changes to these terms</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            We may update these Terms from time to time. Material changes will be notified
            by email at least 14 days before taking effect. Continued use after that date
            constitutes acceptance of the updated Terms.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold mb-3">12. Contact</h2>
          <p style={{ color: 'var(--text-muted)' }}>
            For questions about these Terms, email{' '}
            <a href="mailto:legal@whiskyhunter.com" style={{ color: 'var(--primary)' }}>
              legal@whiskyhunter.com
            </a>.
          </p>
        </section>

      </div>
    </div>
  );
}
