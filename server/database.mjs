import fs from 'node:fs';
import pg from 'pg';

export function createDatabase(env = process.env) {
  if (!env.DATABASE_URL) return null;
  let url; try { url = new URL(env.DATABASE_URL); } catch { throw new Error('DATABASE_URL is not a valid PostgreSQL URL.'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must use postgres:// or postgresql://.');
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

export function databaseIssue(error) {
  const code = error?.code;
  const messages = {
    EAI_AGAIN: 'Database hostname resolution failed. Check DNS and the Aiven service hostname.',
    ENOTFOUND: 'Database hostname was not found. Check the Aiven service hostname and DNS.',
    ECONNREFUSED: 'Database connection was refused. Check service status, port, and access rules.',
    ETIMEDOUT: 'Database connection timed out. Check network access and Aiven IP allowlisting.',
    '28P01': 'Database authentication failed. Check the server-side username and password.',
    '28000': 'Database access was denied. Check the service access rules and user.',
    '3D000': 'The configured database does not exist.',
    '42501': 'Database user lacks permission to create or access the arcclear schema.',
    DEPTH_ZERO_SELF_SIGNED_CERT: 'Database certificate verification failed. Check the Aiven CA certificate configuration.',
  };
  return { code: Object.hasOwn(messages, code) ? code : 'DATABASE_UNAVAILABLE', message: messages[code] ?? 'Database connection failed. Check the API terminal and server configuration.' };
}
