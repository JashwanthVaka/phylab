import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';
import handler from '../server.js';

const server = http.createServer(handler);
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path, ...options }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    if (options.body) req.write(options.body);
    req.end();
  });
}

test('the shell and API errors use the same protective browser headers', async () => {
  const shell = await request('/');
  const api = await request('/api/does-not-exist');
  for (const response of [shell, api]) {
    assert.equal(response.headers['x-content-type-options'], 'nosniff');
    assert.equal(response.headers['x-frame-options'], 'DENY');
    assert.equal(response.headers['cross-origin-opener-policy'], 'same-origin');
    assert.match(response.headers['content-security-policy'], /default-src 'self'/);
    assert.match(response.headers['content-security-policy'], /script-src 'self'/);
    assert.doesNotMatch(response.headers['content-security-policy'], /script-src 'self' 'unsafe-inline'/);
  }
});

test('the tutor rejects a forged image before it reaches an AI provider', async () => {
  const response = await request('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'Explain this graph', image: 'data:image/png;base64,SGVsbG8=' })
  });
  assert.equal(response.status, 400);
  assert.match(response.body, /genuine PNG, JPEG, WebP, or GIF/i);
});

test.after(() => new Promise(resolve => server.close(resolve)));
