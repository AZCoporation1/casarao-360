// Carrega .env.local no processo dos testes/teardown (o Playwright não lê
// env files sozinho; o dev server Next carrega os dele separadamente).
import fs from 'fs';
import path from 'path';

export function loadEnv() {
  const file = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^"(.*)"$/, '$1');
  }
}

loadEnv();
