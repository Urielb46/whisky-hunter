import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './src/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? '',
  },
  // CRITICAL: Do NOT run `drizzle-kit introspect` after manual partition SQL is added.
  // See RESEARCH.md Pitfall 1.
  strict: true,
  verbose: true,
});
