/**
 * Better Auth instance — shared across API routes and middleware.
 * Supports email/password + Google OAuth.
 */
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db } from '@whisky-hunter/database';
import * as schema from '@whisky-hunter/database';
import { sendVerificationEmail, sendPasswordReset } from './email.js';

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: 'pg',
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verifications,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: process.env['NODE_ENV'] === 'production',
    sendVerificationEmail: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendVerificationEmail(user.email, url);
    },
    sendResetPassword: async ({ user, url }: { user: { email: string }; url: string }) => {
      await sendPasswordReset(user.email, url);
    },
  },
  socialProviders: {
    google: {
      clientId: process.env['GOOGLE_CLIENT_ID'] ?? '',
      clientSecret: process.env['GOOGLE_CLIENT_SECRET'] ?? '',
    },
  },
  trustedOrigins: [
    'http://localhost:3001',
    'https://whiskyhunter.com',
  ],
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24,       // refresh if older than 1 day
  },
});

export type Auth = typeof auth;
