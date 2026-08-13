/**
 * Indexes a study source you own into KINETIQ's private library so KIT can answer from it.
 *
 * Everything this touches lives under private/, which is git-ignored. The extracted
 * text is never added to data/, never served by /api/content/index, and never copied
 * into the static build — so nothing here can reach GitHub or the published site.
 *
 * Usage:
 *   node tools/ingest-book.mjs private/books/my-physics-coursebook.pdf
 *   node tools/ingest-book.mjs private/books/notes.txt --title "Class notes"
 */
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const LIBRARY = path.join(ROOT, 'private', 'library');
const CHUNK = 1200;
const OVERLAP = 150;

const slugify = value => String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

/** Splits a page into overlapping chunks so a passage spanning a boundary is still retrievable. */
function chunkPage(text, page, source) {
  const clean = String(text).replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (clean.length < 40) return [];
  const chunks = [];
  for (let start = 0; start < clean.length; start += CHUNK - OVERLAP) {
    const body = clean.slice(start, start + CHUNK).trim();
    if (body.length < 40) continue;
    chunks.push({ source, page, body });
    if (start + CHUNK >= clean.length) break;
  }
  return chunks;
}

async function readPages(file) {
  if (/\.pdf$/i.test(file)) {
    const { stdout } = await run('/usr/bin/python3', [path.join(ROOT, 'tools', 'extract-pdf.py'), file], { maxBuffer: 512 * 1024 * 1024 });
    const parsed = JSON.parse(stdout);
    return { pages: parsed.pages, emptyPages: parsed.emptyPages };
  }
  const raw = await fs.readFile(file, 'utf8');
  // Treat form feeds as page breaks, otherwise split on blank-line groups.
  const pages = raw.includes('\f') ? raw.split('\f') : raw.split(/\n\s*\n\s*\n+/);
  return { pages, emptyPages: 0 };
}

const [input, ...rest] = process.argv.slice(2);
if (!input) {
  console.error('usage: node tools/ingest-book.mjs <file.pdf|file.txt> [--title "Book title"]');
  process.exit(2);
}

const titleFlag = rest.indexOf('--title');
const file = path.resolve(ROOT, input);
const relative = path.relative(ROOT, file);
if (!relative.startsWith('private' + path.sep)) {
  console.error(`Refusing to read ${relative}.\nPut the file under private/books/ so it stays git-ignored.`);
  process.exit(1);
}

const title = titleFlag >= 0 ? rest[titleFlag + 1] : path.basename(file).replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ');
const slug = slugify(title);

const { pages, emptyPages } = await readPages(file);
const chunks = pages.flatMap((text, index) => chunkPage(text, index + 1, title));

if (!chunks.length) {
  console.error('No readable text found. If this is a scanned PDF the pages are images, which needs OCR — this tool only reads embedded text.');
  process.exit(1);
}

await fs.mkdir(LIBRARY, { recursive: true });
const target = path.join(LIBRARY, `${slug}.json`);
await fs.writeFile(target, JSON.stringify({ title, slug, sourceFile: path.basename(file), pages: pages.length, ingestedAt: new Date().toISOString(), chunks }, null, 0));

const words = chunks.reduce((total, chunk) => total + chunk.body.split(/\s+/).length, 0);
console.log(`Indexed "${title}"`);
console.log(`  ${pages.length} pages, ${chunks.length} passages, ~${words.toLocaleString()} words`);
if (emptyPages) console.log(`  ${emptyPages} pages had little or no embedded text (likely scanned images)`);
console.log(`  written to private/library/${slug}.json (git-ignored)`);
console.log('Restart the server to load it.');
