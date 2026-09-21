/**
 * Turns the two browser-safe Supabase project values into a working setup.
 *
 * Everything here could be done by hand, which is exactly why it should not
 * be: the steps are fiddly. This writes the values where they belong and
 * prints the migrations to run.
 *
 *   node tools/setup-accounts.mjs \
 *     --url https://xxxx.supabase.co \
 *     --anon <anon public key>
 *
 * Values may also come from SUPABASE_URL and SUPABASE_ANON_KEY.
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

const problems = [];
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url)) problems.push('--url should look like https://yourproject.supabase.co');
if (anon.length < 30) problems.push('--anon looks too short to be the anon public key');

if (problems.length) {
  console.error('\nSomething is not right yet:\n');
  problems.forEach(item => console.error('  - ' + item));
  console.error('\nBoth values are on the Supabase dashboard under Project Settings -> API.\n');
  process.exit(1);
}

// 1. Browser-safe values. These are optional now -- the browser falls back to
//    /api/config, which reads the same environment -- but writing them keeps a
//    static export working and costs nothing.
const envFile = path.join(ROOT, 'public-env.js');
fs.writeFileSync(envFile,
  `window.PHYLAB_ENV = window.PHYLAB_ENV || { SUPABASE_URL: '${url}', SUPABASE_ANON_KEY: '${anon}' };\n`);

// 2. Local server values. .env is git-ignored.
const dotenv = path.join(ROOT, '.env');
const existing = fs.existsSync(dotenv) ? fs.readFileSync(dotenv, 'utf8') : '';
const upsert = (text, key, val) => (new RegExp(`^${key}=.*$`, 'm').test(text)
  ? text.replace(new RegExp(`^${key}=.*$`, 'm'), `${key}=${val}`)
  : `${text.replace(/\n*$/, '\n')}${key}=${val}\n`);
let next = existing;
next = upsert(next, 'SUPABASE_URL', url);
next = upsert(next, 'SUPABASE_ANON_KEY', anon);
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
  .env            project URL and anon key, git-ignored, never committed

Two things happen outside this machine:

1. Run these migrations in the Supabase SQL editor, in this order:
${migrations.map(name => `     supabase/migrations/${name}`).join('\n')}

   The second one closes a privilege escalation: without it any signed-in
   student can make themselves an administrator and read everyone's data.

2. Put the same two values into Vercel -> Settings -> Environment Variables.
   This is the only step the live site needs: the browser reads the two public
   ones from /api/config, so no file has to be edited or redeployed by hand.

     SUPABASE_URL=${url}
     SUPABASE_ANON_KEY=${anon.slice(0, 12)}...

Then: npm start, and GET /api/health should report adminConfigured true.
`);
