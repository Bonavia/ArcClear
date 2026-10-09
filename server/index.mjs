import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import http from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import { isAddress, verifyMessage } from 'viem';
import { loadServerEnvironment } from './environment.mjs';
import { createDatabase, migrate, databaseIssue } from './database.mjs';
import { validateWorkspace } from './validation.mjs';
export function createApiServer({ pool, port = 8787, production = false, origin = `http://localhost:${production ? port : 5173}`, initiallyReady = true }) {
let ready = initiallyReady;
let issue = pool ? {code:'CONNECTING',message:'Connecting to PostgreSQL.'} : {code:'NOT_CONFIGURED',message:'Set DATABASE_URL in .env or .env.local, then restart the API.'};
const allowed = new Set([origin, ...(!production ? ['http://127.0.0.1:5173', 'http://localhost:4173', 'http://127.0.0.1:4173'] : [])]);
const digest = value => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
async function body(req) {
  const chunks = []; let bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > 65536) throw fail(413, 'Workspace is too large.'); chunks.push(chunk); }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch { throw fail(400, 'Invalid JSON.'); }
}
async function session(req) {
  const token = /(?:^|;\s*)arcclear_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie ?? '')?.[1];
  if (!token) return null;
  const result = await pool.query('SELECT address FROM arcclear.sessions WHERE token_hash=$1 AND expires_at > now()', [digest(token)]);
  return result.rows[0]?.address ?? null;
}
function cookie(res, token, age) { res.setHeader('Set-Cookie', `arcclear_session=${token}; Path=/api; HttpOnly; SameSite=Strict; Max-Age=${age}${origin.startsWith('https:') ? '; Secure' : ''}`); }
const rates = new Map();
function limit(req) {
  const key = req.socket.remoteAddress; const now = Date.now(); let entry = rates.get(key);
  if (!entry || entry.until < now) { entry = { count: 0, until: now + 60000 }; rates.set(key, entry); }
  if (++entry.count > 120) throw fail(429, 'Too many requests. Retry shortly.');
  if (rates.size > 10000) for (const [ip, value] of rates) if (value.until < now) rates.delete(ip);
}
async function api(req, res, pathname) {
  limit(req);
  if (req.method !== 'GET' && !allowed.has(req.headers.origin)) throw fail(403, 'Request origin is not allowed.');
  if (pathname === '/api/health' && req.method === 'GET') {
    if (!pool || !ready) return json(res, 503, { database: pool ? 'unavailable' : 'not configured', ...issue });
    try { await pool.query('SELECT 1'); return json(res, 200, { database: 'connected' }); }
    catch (error) { return json(res, 503, { database: 'unavailable', ...databaseIssue(error) }); }
  }
  if (!ready) throw fail(503, 'Database unavailable. Check server configuration.');
  if (pathname === '/api/auth/challenge' && req.method === 'POST') {
    const { address } = await body(req); if (!isAddress(address)) throw fail(400, 'Invalid wallet address.');
    const nonce = randomBytes(24).toString('hex'); const expires = new Date(Date.now() + 5 * 60000);
    const message = `ArcClear workspace sign-in\nSite: ${req.headers.origin}\nWallet: ${address.toLowerCase()}\nNonce: ${nonce}\nExpires: ${expires.toISOString()}\n\nThis signature signs you in to save workspace drafts. It does not approve transactions or transfer USDC.`;
    await pool.query('DELETE FROM arcclear.challenges WHERE expires_at < now()');
    await pool.query('INSERT INTO arcclear.challenges (nonce,address,message,expires_at) VALUES ($1,$2,$3,$4)', [nonce,address.toLowerCase(),message,expires]);
    return json(res, 200, { nonce, message });
  }
  if (pathname === '/api/auth/verify' && req.method === 'POST') {
    const { nonce, signature } = await body(req);
    if (typeof nonce !== 'string' || !/^[a-f0-9]{48}$/.test(nonce) || typeof signature !== 'string' || !/^0x[0-9a-fA-F]{130}$/.test(signature)) throw fail(400, 'Invalid sign-in proof.');
    // Consuming the nonce before verification prevents replay, including concurrent requests.
    const consumed = await pool.query('DELETE FROM arcclear.challenges WHERE nonce=$1 AND expires_at > now() RETURNING address,message', [nonce]);
    const challenge = consumed.rows[0];
    if (!challenge || !challenge.message.includes(`Site: ${req.headers.origin}\n`)) throw fail(401, 'Sign-in expired. Try again.');
    if (!await verifyMessage({ address: challenge.address, message: challenge.message, signature })) throw fail(401, 'Wallet signature is invalid.');
    const token = randomBytes(32).toString('hex');
    await pool.query('DELETE FROM arcclear.sessions WHERE expires_at < now()');
    await pool.query("INSERT INTO arcclear.sessions (token_hash,address,expires_at) VALUES ($1,$2,now()+interval '7 days')", [digest(token),challenge.address]);
    cookie(res,token,604800); return json(res,200,{ address: challenge.address });
  }
  const owner = await session(req);
  if (pathname === '/api/session' && req.method === 'GET') return json(res,200,{ address: owner });
  if (!owner) throw fail(401, 'Sign in with your wallet to access your workspace.');
  if (pathname === '/api/auth/logout' && req.method === 'POST') {
    const token = /arcclear_session=([a-f0-9]{64})/.exec(req.headers.cookie ?? '')?.[1];
    if (token) await pool.query('DELETE FROM arcclear.sessions WHERE token_hash=$1', [digest(token)]);
    cookie(res,'',0); return json(res,200,{ ok:true });
  }
  if (pathname === '/api/workspace' && req.method === 'GET') {
    const result = await pool.query('SELECT data,revision,updated_at FROM arcclear.workspaces WHERE owner_address=$1', [owner]);
    return json(res,200,{ workspace: result.rows[0] ?? null });
  }
  if (pathname === '/api/workspace' && req.method === 'PUT') {
    const input = await body(req); let data;
    try { data = validateWorkspace(input.data); } catch (e) { throw fail(400,e.message); }
    const revision = Number(input.revision ?? 0); if (!Number.isSafeInteger(revision) || revision < 0) throw fail(400,'Invalid revision.');
    // Optimistic locking prevents silent overwrite from another browser.
    const result = revision === 0
      ? await pool.query('INSERT INTO arcclear.workspaces(owner_address,data) VALUES($1,$2) ON CONFLICT DO NOTHING RETURNING revision,updated_at',[owner,data])
      : await pool.query('UPDATE arcclear.workspaces SET data=$2,revision=revision+1,updated_at=now() WHERE owner_address=$1 AND revision=$3 RETURNING revision,updated_at',[owner,data,revision]);
    if (!result.rows.length) throw fail(409,'Workspace changed in another browser. Load the saved workspace before saving.');
    return json(res,200,result.rows[0]);
  }
  throw fail(404,'API route not found.');
}
const types = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.json':'application/json', '.woff2':'font/woff2' };
const server = http.createServer(async(req,res)=>{
  try {
    const pathname = new URL(req.url,'http://localhost').pathname;
    if (pathname.startsWith('/api/')) return await api(req,res,pathname);
    if (!production || !['GET','HEAD'].includes(req.method)) throw fail(404,'Not found.');
    const root=path.resolve('dist'); const resolved=path.resolve(root,'.'+decodeURIComponent(pathname));
    if (resolved !== root && !resolved.startsWith(root+path.sep)) throw fail(404,'Not found.');
    const file=fs.existsSync(resolved)&&fs.statSync(resolved).isFile()?resolved:path.join(root,'index.html');
    if (!fs.existsSync(file)) throw fail(503,'Build the site before starting production.');
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD') return res.end();fs.createReadStream(file).pipe(res);
  } catch(e) { if(!res.headersSent) json(res,e.status??503,{ error:e.status?e.message:'Database request failed. Retry or check server configuration.' }); else res.end(); }
});
return { server, setReady: (value, error) => { ready = value; if (error) issue = databaseIssue(error); } };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  loadServerEnvironment();
  const pool = createDatabase();
  const port = Number(process.env.API_PORT || process.env.PORT || 8787);
  const production = process.argv.includes('--production');
  const { server, setReady } = createApiServer({ pool, port, production, origin: process.env.APP_ORIGIN || `http://localhost:${production ? port : 5173}`, initiallyReady: false });
  server.listen(port,process.env.API_HOST||'127.0.0.1',()=>console.log(`ArcClear ${production?'site':'API'}: http://localhost:${port}`));
  async function initialize() {
    if (!pool) { console.log('PostgreSQL not configured. Set DATABASE_URL in .env or .env.local.'); return; }
    try { await migrate(pool); setReady(true); console.log('PostgreSQL connected; ArcClear schema ready.'); }
    catch(e) { setReady(false,e); const problem=databaseIssue(e); console.error(`PostgreSQL unavailable (${problem.code}): ${problem.message} Retrying in 15 seconds.`); const timer=setTimeout(initialize,15000);timer.unref(); }
  }
  initialize();
  for(const event of ['SIGINT','SIGTERM']) process.on(event,()=>server.close(async()=>{await pool?.end();process.exit();}));
}
