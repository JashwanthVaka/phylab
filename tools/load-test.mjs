/**
 * Read-only KINETIQ load probe with no third-party dependencies.
 *
 * Local example:
 *   node tools/load-test.mjs --base=http://127.0.0.1:3101 --requests=2000 --concurrency=1000
 *
 * Production is deliberately capped at 50 concurrent requests. This tool is
 * for capacity evidence, not for overwhelming the public service.
 */

import { performance } from 'node:perf_hooks';

const values = Object.fromEntries(process.argv.slice(2).map(argument => {
  const [key, ...rest] = argument.replace(/^--/, '').split('=');
  return [key, rest.join('=')];
}));

const base = String(values.base || 'http://127.0.0.1:3000').replace(/\/$/, '');
const requests = Math.max(1, Number.parseInt(values.requests || '1000', 10));
const concurrency = Math.max(1, Math.min(requests, Number.parseInt(values.concurrency || '50', 10)));
const timeoutMs = Math.max(1000, Number.parseInt(values.timeout || '15000', 10));
const paths = String(values.paths || '/,/library,/api/health,/api/content/index,/api/answer?q=What%20is%20escape%20speed%3F')
  .split(',').map(path => path.trim()).filter(path => path.startsWith('/'));

if (!paths.length) throw new Error('Provide at least one read-only path beginning with /.');
if (/\.vercel\.app$/i.test(new URL(base).hostname) && concurrency > 50) {
  throw new Error('Production probes are capped at 50 concurrent requests. Test higher concurrency locally or on a dedicated staging deployment.');
}

let cursor = 0;
const durations = [];
const observations = [];
const statuses = new Map();
const failures = [];
const started = performance.now();

async function worker() {
  while (true) {
    const index = cursor++;
    if (index >= requests) return;
    const path = paths[index % paths.length];
    const requestStarted = performance.now();
    try {
      const response = await fetch(base + path, {
        headers: { Accept: path.startsWith('/api/') ? 'application/json' : 'text/html' },
        signal: AbortSignal.timeout(timeoutMs),
      });
      await response.arrayBuffer();
      const duration = performance.now() - requestStarted;
      durations.push(duration);
      observations.push({ path, duration, ok: response.ok });
      statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
      if (!response.ok) failures.push({ path, status: response.status });
    } catch (error) {
      const duration = performance.now() - requestStarted;
      durations.push(duration);
      observations.push({ path, duration, ok: false });
      failures.push({
        path,
        error: error.name || 'Error',
        message: error.message || '',
        cause: error.cause?.code || error.cause?.message || '',
      });
    }
  }
}

await Promise.all(Array.from({ length: concurrency }, worker));
durations.sort((a, b) => a - b);
const elapsedMs = performance.now() - started;
const percentile = value => Math.round(durations[Math.min(durations.length - 1, Math.ceil(durations.length * value) - 1)] || 0);
const perPath = Object.fromEntries(paths.map(path => {
  const rows = observations.filter(row => row.path === path);
  const times = rows.map(row => row.duration).sort((a, b) => a - b);
  const at = value => Math.round(times[Math.min(times.length - 1, Math.ceil(times.length * value) - 1)] || 0);
  return [path, { requests: rows.length, failed: rows.filter(row => !row.ok).length, p50: at(0.50), p95: at(0.95) }];
}));
const report = {
  base,
  requests,
  concurrency,
  paths,
  successful: requests - failures.length,
  failed: failures.length,
  statusCodes: Object.fromEntries([...statuses].sort(([left], [right]) => left - right)),
  latencyMs: { p50: percentile(0.50), p95: percentile(0.95), p99: percentile(0.99), maximum: Math.round(durations.at(-1) || 0) },
  elapsedMs: Math.round(elapsedMs),
  requestsPerSecond: Number((requests / (elapsedMs / 1000)).toFixed(1)),
  perPath,
  sampleFailures: failures.slice(0, 10),
};

console.log(JSON.stringify(report, null, 2));
if (failures.length) process.exitCode = 1;
