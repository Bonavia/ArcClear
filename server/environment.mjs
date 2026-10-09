import fs from 'node:fs';
import path from 'node:path';
import { parseEnv } from 'node:util';

// Same file precedence as Vite: .env.local overrides .env; process environment wins.
export function loadServerEnvironment(directory = process.cwd(), env = process.env) {
  const values = {};
  for (const name of ['.env', '.env.local']) {
    const file = path.join(directory, name);
    if (fs.existsSync(file)) Object.assign(values, parseEnv(fs.readFileSync(file, 'utf8')));
  }
  for (const [key, value] of Object.entries(values)) if (env[key] === undefined) env[key] = value;
  return env;
}
