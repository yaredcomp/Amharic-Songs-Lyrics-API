import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema.ts';

declare global {
  var _postgresPool: Pool | undefined;
}

/**
 * Parses a PostgreSQL connection string, returning `null` for empty or
 * placeholder values (e.g. `postgresql://` in a local `.env`).
 */
const parseDatabaseUrl = (value: string | undefined): URL | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;

  try {
    const url = new URL(trimmed);
    const isPostgres = url.protocol === 'postgres:' || url.protocol === 'postgresql:';
    return isPostgres && url.hostname ? url : null;
  } catch {
    return null;
  }
};

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Resolves the pool configuration.
 *
 * - `DATABASE_URL` takes precedence (Render, Docker, managed Postgres).
 * - Otherwise the discrete `SQL_*` variables are used (local development).
 * - TLS is enabled automatically for non-local hosts; Render's managed
 *   Postgres uses its own CA, hence `rejectUnauthorized: false`.
 */
const resolvePoolConfig = (): PoolConfig => {
  const databaseUrl = parseDatabaseUrl(process.env.DATABASE_URL);

  if (databaseUrl) {
    const isLocal = LOCAL_HOSTS.has(databaseUrl.hostname);
    return {
      connectionString: databaseUrl.toString(),
      max: 10,
      connectionTimeoutMillis: 15000,
      ssl: isLocal ? undefined : { rejectUnauthorized: false },
    };
  }

  return {
    host: process.env.SQL_HOST,
    user: process.env.SQL_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.SQL_DB_NAME,
    max: 10,
    connectionTimeoutMillis: 15000,
    ssl: process.env.SQL_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  };
};

export const createPool = (): Pool => {
  if (!global._postgresPool) {
    global._postgresPool = new Pool(resolvePoolConfig());

    global._postgresPool.on('error', (err) => {
      console.error('Unexpected error on idle SQL pool client:', err);
    });
  }
  return global._postgresPool;
};

export const pool = createPool();
export const db = drizzle(pool, { schema });
