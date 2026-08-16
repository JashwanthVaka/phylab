/**
 * Guards the boundary around private/. A personally-owned book indexed for study
 * must never reach the git repository, data/, or the published static build.
 */
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

// 1. private/ must be git-ignored, whether or not it currently exists.
const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
assert.ok(/^private\/?$/m.test(ignore), '.gitignore must contain a `private/` rule');

// 2. git must not be tracking anything under private/.
const tracked = execFileSync('git', ['ls-files', 'private'], { cwd: ROOT, encoding: 'utf8' }).trim();
assert.equal(tracked, '', `git is tracking files under private/:\n${tracked}`);

// 3. No tracked file may contain a live API key. .env.example is a template that
//    gets published, and editing it instead of .env is an easy mistake to make.
const SECRET_PATTERNS = [
  [/\bgsk_[A-Za-z0-9]{20,}/, 'Groq API key'],
  [/\bsk-[A-Za-z0-9-]{20,}/, 'OpenAI or Anthropic API key'],
  [/\bAIza[A-Za-z0-9_-]{20,}/, 'Google API key']
];
const trackedFiles = execFileSync('git', ['ls-files'], { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
for (const file of trackedFiles) {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full) || fs.statSync(full).size > 2_000_000) continue;
  let contents;
  try { contents = fs.readFileSync(full, 'utf8'); } catch { continue; }
  for (const [pattern, label] of SECRET_PATTERNS) {
    assert.ok(!pattern.test(contents), `${file} contains what looks like a ${label}. Secrets belong in .env, which is git-ignored.`);
  }
}

// 4. A deployed image must not carry personally-owned sources. The Dockerfile does
//    `COPY . .`, so .dockerignore is the only thing standing between a private book
//    and a public server.
const dockerignore = fs.readFileSync(path.join(ROOT, '.dockerignore'), 'utf8');
assert.ok(/^private\/?$/m.test(dockerignore), '.dockerignore must exclude private/');
assert.ok(/^\.env$/m.test(dockerignore), '.dockerignore must exclude .env');

// 5. npm ci refuses to run when the lock file and manifest disagree, which would
//    break every container build.
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(ROOT, 'package-lock.json'), 'utf8'));
assert.equal(lock.name, manifest.name, 'package-lock.json name must match package.json');
assert.equal(lock.version, manifest.version, 'package-lock.json version must match package.json');

// 6. contentIndex feeds /api/content/index and the static build, so it must not
//    reference the private library at all.
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const indexBody = server.slice(server.indexOf('async function contentIndex'), server.indexOf('const retrievalEngine'));
assert.ok(!/private/i.test(indexBody), 'contentIndex() must not read the private library');

// 7. The private library may only be reached through the retrieval engine.
assert.ok(
  server.includes('getExtraRecords: loadPrivateRecords'),
  'private records should be supplied to the retrieval engine only'
);

// 8. Nothing in the built site may contain private passages.
const buildDirs = ['docs', 'dist'].map(name => path.join(ROOT, name)).filter(dir => fs.existsSync(dir));
if (buildDirs.length) {
  const libraryDir = path.join(ROOT, 'private', 'library');
  const books = fs.existsSync(libraryDir) ? fs.readdirSync(libraryDir).filter(file => file.endsWith('.json')) : [];
  const samples = books.flatMap(file => {
    const book = JSON.parse(fs.readFileSync(path.join(libraryDir, file), 'utf8'));
    // A distinctive slice of each passage is enough to prove it did not leak.
    return (book.chunks || []).slice(0, 25).map(chunk => String(chunk.body).trim().slice(0, 60)).filter(text => text.length >= 40);
  });

  const files = [];
  const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).forEach(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full); else files.push(full);
  });
  buildDirs.forEach(walk);

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8');
    assert.ok(!contents.includes('"private":true'), `${path.relative(ROOT, file)} contains private-flagged records`);
    for (const sample of samples) {
      assert.ok(!contents.includes(sample), `${path.relative(ROOT, file)} contains text from a private source`);
    }
  }
  console.log(`privacy tests passed (checked ${files.length} built files against ${samples.length} private samples)`);
} else {
  console.log('privacy tests passed (no static build present to check)');
}
