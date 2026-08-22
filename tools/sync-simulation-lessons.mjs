/**
 * Copies each simulation's lesson mapping from the studio source into
 * data/simulations.json.
 *
 * The mapping only ever existed inside js/simulationStudio.js, so the data
 * catalogue could not say which lesson a lab belonged to. Nothing could
 * therefore link a lesson to its own simulation -- the single most obvious
 * connection on the site, and the one a student most wants after reading a
 * derivation.
 *
 * Run with: node tools/sync-simulation-lessons.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(ROOT, 'js', 'simulationStudio.js'), 'utf8');
const definitions = source.split('const presets')[0];

// Each definition opens with `slug: { title: ...` and names its lesson inside.
const mapping = new Map();
const blocks = [...definitions.matchAll(/^ {2}'?([a-z][a-z-]*)'?:\s*\{/gm)];
blocks.forEach((match, index) => {
  const start = match.index;
  const end = index + 1 < blocks.length ? blocks[index + 1].index : definitions.length;
  const body = definitions.slice(start, end);
  const lesson = /lesson:\s*'([a-z-]+)'/.exec(body);
  if (lesson) mapping.set(match[1], lesson[1]);
});

const file = path.join(ROOT, 'data', 'simulations.json');
const catalogue = JSON.parse(fs.readFileSync(file, 'utf8'));

let linked = 0;
const orphans = [];
catalogue.forEach(item => {
  const lesson = mapping.get(item.slug);
  if (lesson) { item.lesson = lesson; linked += 1; }
  else orphans.push(item.slug);
});

fs.writeFileSync(file, JSON.stringify(catalogue, null, 2) + '\n');
console.log(`linked ${linked} of ${catalogue.length} simulations to their lesson`);
if (orphans.length) console.log('no lesson found for:', orphans.join(', '));
