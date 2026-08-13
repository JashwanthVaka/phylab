/**
 * Loads personally-owned study sources indexed into private/library/.
 *
 * These records are given only to the retrieval engine, which feeds the tutor's
 * prompt. They are deliberately NOT part of contentIndex(), so they never appear
 * in /api/content/index and are never captured by the static build.
 */
const fs = require('node:fs');
const path = require('node:path');

const LIBRARY = path.join(__dirname, '..', 'private', 'library');

function loadPrivateRecords() {
  let files;
  try {
    files = fs.readdirSync(LIBRARY).filter(file => file.endsWith('.json'));
  } catch {
    return [];
  }

  const records = [];
  for (const file of files) {
    let book;
    try {
      book = JSON.parse(fs.readFileSync(path.join(LIBRARY, file), 'utf8'));
    } catch (error) {
      console.warn(`Skipping private/library/${file}: ${error.message}`);
      continue;
    }
    (book.chunks || []).forEach((chunk, index) => {
      records.push({
        id: `private:${book.slug}:${index}`,
        type: 'Your source',
        title: `${book.title} — p.${chunk.page}`,
        body: String(chunk.body || '').slice(0, 2400),
        href: null,
        metadata: { source: book.title, page: chunk.page, private: true }
      });
    });
  }
  return records;
}

/** Titles and passage counts only — safe to report over /api/health. */
function privateSummary() {
  const records = loadPrivateRecords();
  const byTitle = new Map();
  records.forEach(record => byTitle.set(record.metadata.source, (byTitle.get(record.metadata.source) || 0) + 1));
  return [...byTitle].map(([title, passages]) => ({ title, passages }));
}

module.exports = { loadPrivateRecords, privateSummary };
