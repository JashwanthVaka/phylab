/**
 * Turns four Supabase values into a working account setup.
 *
 * Everything here could be done by hand, which is exactly why it should not
 * be: the steps are fiddly, the secret one is easy to paste into the wrong
 * file, and getting that wrong exposes every user in the project. This writes
 * the browser-safe values where they belong, keeps the secret out of the
 * repository, and prints the SQL to run.
 *
 *   node tools/setup-accounts.mjs \
 *     --url https://xxxx.supabase.co \
 *     --anon <anon public key> \
 *     --service <service_role key> \
 *     --admin you@gmail.com
 *
 * Values may also come from the environment, so nothing secret need appear in
 * shell history: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY,
 * ADMIN_EMAILS.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function args() {
  const out = {};
  const argv = process.argv.slice(2);
  argv.forEach((token, index) => {
    if (!token.startsWith('--')) return;
    const key = token.slice(2);
    const next = argv[index + 1];
    out[key] = next && !next.startsWith('--') ? next : 'true';
  });
  return out;
}

const flags = args();
const value = (flag, env) => flags[flag] || process.env[env] || '';

const url = value('url', 'SUPABASE_URL').replace(/\/$/, '');
const anon = value('anon', 'SUPABASE_ANON_KEY');
const service = value('service', 'SUPABASE_SERVICE_ROLE_KEY');
const admin = value('admin', 'ADMIN_EMAILS');

const problems = [];
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) problems.push('--url should look like https://yourproject.supabase.co');
if (anon.length < 30) problems.push('--anon looks too short to be the anon public key');
if (service.length < 30) problems.push('--service looks too short to be the service_role key');
if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(admin.split(',')[0].trim())) problems.push('--admin should be an email address');

// The single most damaging mistake this script can prevent.
if (anon && service && anon === service) {
  problems.push('--anon and --service are identical. The service_role key must never be the one in the browser.');
}

if (problems.length) {
  console.error('\nSomething is not right yet:\n');
  problems.forEach(item => console.error('  - ' + item));
  console.error('\nBoth keys are on the Supabase dashboard under Project Settings -> API.');
  console.error('The anon key is safe in a browser. The service_role key is not.\n');
  process.exit(1);
}

// 1. Browser-safe values, committed.
const envFile = path.join(ROOT, 'public-env.js');
fs.writeFileSync(envFile,
  `window.PHYLAB_ENV = window.PHYLAB_ENV || { SUPABASE_URL: '${url}', SUPABASE_ANON_KEY: '${anon}' };\n`);

// 2. Secrets, local only. .env is git-ignored.
const dotenv = path.join(ROOT, '.env');
const existing = fs.existsSync(dotenv) ? fs.readFileSync(dotenv, 'utf8') : '';
const upsert = (text, key, val) => (new RegExp(`^${key}=.*$`, 'm').test(text)
  ? text.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${val}`)
  : `${text.replace(/\n*$/, '\n')}${key}=${val}\n`);
let next = existing;
next = upsert(next, 'SUPABASE_URL', url);
next = upsert(next, 'SUPABASE_ANON_KEY', anon);
next = upsert(next, 'SUPABASE_SERVICE_ROLE_KEY', service);
next = upsert(next, 'ADMIN_EMAILS', admin);
fs.writeFileSync(dotenv, next);

// 3. Refuse to continue if .env is not ignored.
const ignore = fs.existsSync(path.join(ROOT, '.gitignore'))
  ? fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8') : '';
if (!/^\.env$/m.test(ignore)) {
  console.error('\n.env is not in .gitignore. Stopping so the service key cannot be committed.\n');
  process.exit(1);
}

const migrations = fs.readdirSync(path.join(ROOT, 'supabase', 'migrations'))
  .filter(name => name.endsWith('.sql')).sort();

console.log(`
Local setup written.

  public-env.js   URL and anon key, safe in the browser
  .env            all four values, git-ignored, never committed

Two things happen outside this machine:

1. Run these migrations in the Supabase SQL editor, in this order:
${migrations.map(name => `     supabase/migrations/${name}`).join('\n')}

   The second one closes a privilege escalation: without it any signed-in
   student can make themselves an administrator and read everyone's data.

2. Put the same four values into Vercel -> Settings -> Environment Variables,
   so the deployed site has them too:

     SUPABASE_URL=${url}
     SUPABASE_ANON_KEY=${anon.slice(0, 12)}...
     SUPABASE_SERVICE_ROLE_KEY=(the service_role key, secret)
     ADMIN_EMAILS=${admin}

Then: npm start, and GET /api/health should report adminConfigured true.
`);
