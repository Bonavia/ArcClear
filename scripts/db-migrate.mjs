import { loadServerEnvironment } from '../server/environment.mjs';
import { createDatabase, migrate, databaseIssue } from '../server/database.mjs';
loadServerEnvironment();
const pool = createDatabase();
try { await migrate(pool); console.log('ArcClear PostgreSQL schema is ready.'); }
catch (e) { const problem=databaseIssue(e); console.error(`Database setup failed (${problem.code}): ${problem.message}`); process.exitCode = 1; }
finally { await pool?.end(); }
