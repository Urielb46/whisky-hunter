/**
 * Resend email helpers — used by Better Auth callbacks and manual triggers.
 * Requires env: RESEND_API_KEY, RESEND_FROM (optional), NEXT_PUBLIC_API_URL
 */
import { Resend } from 'resend';

const resend = new Resend(process.env['RESEND_API_KEY'] ?? '');

const FROM =
  process.env['RESEND_FROM'] ?? 'WhiskyHunter <onboarding@resend.dev>';

const APP_URL =
  process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Email verification
// ---------------------------------------------------------------------------

export async function sendVerificationEmail(
  email: string,
  url: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Verify your WhiskyHunter email',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#b8860b">WhiskyHunter 🥃</h2>
        <p>Click the button below to verify your email address.</p>
        <a href="${url}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;
                  background:#b8860b;color:#fff;border-radius:6px;
                  text-decoration:none;font-weight:700">
          Verify Email
        </a>
        <p style="margin-top:24px;color:#888;font-size:13px">
          If you didn't create a WhiskyHunter account, ignore this email.
        </p>
      </div>`,
  });

  if (error) {
    console.error('[email] sendVerificationEmail failed:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Password reset
// ---------------------------------------------------------------------------

export async function sendPasswordReset(
  email: string,
  url: string,
): Promise<void> {
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: 'Reset your WhiskyHunter password',
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#b8860b">WhiskyHunter 🥃</h2>
        <p>Someone requested a password reset for your account.</p>
        <a href="${url}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;
                  background:#b8860b;color:#fff;border-radius:6px;
                  text-decoration:none;font-weight:700">
          Reset Password
        </a>
        <p style="margin-top:24px;color:#888;font-size:13px">
          This link expires in 1 hour. If you didn't request a reset, ignore this email.
        </p>
      </div>`,
  });

  if (error) {
    console.error('[email] sendPasswordReset failed:', error);
    throw new Error(`Email send failed: ${error.message}`);
  }
}

// ---------------------------------------------------------------------------
// Price alert notification (email fallback when no push token)
// ---------------------------------------------------------------------------

export async function sendPriceAlertEmail(
  email: string,
  opts: {
    productName: string;
    currentPriceGbp: number; // in pence
    targetPriceGbp: number;  // in pence
    productId: string;
  },
): Promise<void> {
  const current = (opts.currentPriceGbp / 100).toFixed(2);
  const target  = (opts.targetPriceGbp  / 100).toFixed(2);
  const url     = `${APP_URL}/products/${opts.productId}`;

  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    subject: `Price alert: ${opts.productName} is now £${current}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
        <h2 style="color:#b8860b">🥃 Price Alert Triggered</h2>
        <p><strong>${opts.productName}</strong> has dropped to
           <strong>£${current}</strong> — below your target of £${target}.</p>
        <a href="${url}"
           style="display:inline-block;margin-top:16px;padding:12px 24px;
                  background:#b8860b;color:#fff;border-radius:6px;
                  text-decoration:none;font-weight:700">
          View Product
        </a>
      </div>`,
  });

  if (error) {
    console.error('[email] sendPriceAlertEmail failed:', error);
  }
}
