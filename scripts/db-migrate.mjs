import fs from 'node:fs';
import { createDatabase, migrate } from '../server/database.mjs';
if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');
const pool = createDatabase();
try { await migrate(pool); console.log('ArcClear PostgreSQL schema is ready.'); }
catch (e) { console.error(`Database setup failed (${e.code ?? 'connection/configuration error'}). Check the server environment and database access.`); process.exitCode = 1; }
finally { await pool?.end(); }
