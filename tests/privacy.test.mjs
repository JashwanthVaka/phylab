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

// 3. contentIndex feeds /api/content/index and the static build, so it must not
//    reference the private library at all.
const server = fs.readFileSync(path.join(ROOT, 'server.js'), 'utf8');
const indexBody = server.slice(server.indexOf('async function contentIndex'), server.indexOf('const retrievalEngine'));
assert.ok(!/private/i.test(indexBody), 'contentIndex() must not read the private library');

// 4. The private library may only be reached through the retrieval engine.
assert.ok(
  server.includes('getExtraRecords: loadPrivateRecords'),
  'private records should be supplied to the retrieval engine only'
);

// 5. Nothing in the built site may contain private passages.
const docs = path.join(ROOT, 'docs');
if (fs.existsSync(docs)) {
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
  walk(docs);

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8');
    assert.ok(!contents.includes('"private":true'), `${path.relative(ROOT, file)} contains private-flagged records`);
    for (const sample of samples) {
      assert.ok(!contents.includes(sample), `${path.relative(ROOT, file)} contains text from a private source`);
    }
  }
  console.log(`privacy tests passed (checked ${files.length} built files against ${samples.length} private samples)`);
} else {
  console.log('privacy tests passed (no docs/ build present to check)');
}
