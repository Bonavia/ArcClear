import fs from 'node:fs';
import pg from 'pg';

export function createDatabase(env = process.env) {
  if (!env.DATABASE_URL) return null;
  const url = new URL(env.DATABASE_URL);
  const mode = url.searchParams.get('sslmode') ?? 'require';
  for (const key of ['sslmode', 'sslcert', 'sslkey', 'sslrootcert']) url.searchParams.delete(key);
  if (!['require', 'verify-ca', 'verify-full'].includes(mode)) throw new Error('Database TLS is required.');
  const ca = env.DATABASE_CA_FILE ? fs.readFileSync(env.DATABASE_CA_FILE, 'utf8') : undefined;
  if (mode !== 'require' && !ca) throw new Error('Verified TLS requires DATABASE_CA_FILE.');
  const pool = new pg.Pool({ connectionString: url.toString(), ssl: ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }, max: 5, connectionTimeoutMillis: 8000, idleTimeoutMillis: 30000, statement_timeout: 10000 });
  pool.on('error', () => console.error('Database connection interrupted.'));
  return pool;
}
export async function migrate(pool) {
  if (!pool) throw new Error('DATABASE_URL is missing.');
  await pool.query(fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'));
}
