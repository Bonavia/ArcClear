import { createApiServer } from './index.mjs';
import { createDatabase, migrate, databaseIssue } from './database.mjs';

// One pool and initialization promise per warm function instance. Failed startup retries
// on the next request rather than depending on background timers in a serverless runtime.
export function createVercelHandler({ env = process.env, pool = createDatabase(env) } = {}) {
  const hostname = env.VERCEL_URL || env.VERCEL_PROJECT_PRODUCTION_URL;
  const origin = env.APP_ORIGIN || (hostname ? `https://${hostname}` : 'http://localhost:5173');
  const allowedOrigins = [env.VERCEL_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter(Boolean).map(host => `https://${host}`);
  const app = createApiServer({ pool, production: true, origin, allowedOrigins, initiallyReady: false });
  let initialized = false;
  let initialization;
  async function initialize() {
    if (!pool || initialized) return;
    if (!initialization) initialization = migrate(pool).then(() => {
      initialized = true; app.setReady(true);
    }).catch(error => {
      app.setReady(false, error);
    }).finally(() => { initialization = null; });
    await initialization;
  }
  return async function handler(req, res) {
    await initialize();
    const url = new URL(req.url, origin);
    const route = req.query?.route ?? url.searchParams.get('route');
    if (route && /^\/?[a-z]+(?:\/[a-z]+)*$/.test(String(route))) req.url = `/api/${String(route).replace(/^\//, '')}`;
    // Only the API is served by this function; Vercel serves the Vite assets separately.
    if (!new URL(req.url, origin).pathname.startsWith('/api/')) {
      res.writeHead(404, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({error:'API route not found.'})); return;
    }
    return app.handler(req, res);
  };
}

let handler;
export default async function vercelHandler(req, res) {
  try {
    handler ??= createVercelHandler();
    return await handler(req, res);
  } catch (error) {
    if (!res.headersSent) {
      const issue = databaseIssue(error);
      res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ database:'unavailable', ...issue }));
    } else res.end();
  }
}
