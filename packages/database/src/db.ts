import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';

const connectionString = process.env['DATABASE_URL'];
if (!connectionString) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Single connection for migrations; pool for app
export const migrationClient = postgres(connectionString, { max: 1 });
export const queryClient = postgres(connectionString);

export const db = drizzle(queryClient, { schema });

export type Db = typeof db;
