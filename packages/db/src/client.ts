import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema.js';

/**
 * Postgres ulanishi (postgres.js drayveri) ustida Drizzle mijozini yaratadi.
 * Har bir servis (api, realtime, workers) bir marta chaqiradi.
 */
export function createDb(connectionString: string, opts?: { max?: number }) {
  const client = postgres(connectionString, { max: opts?.max ?? 10 });
  return drizzle(client, { schema });
}

export type Database = ReturnType<typeof createDb>;
