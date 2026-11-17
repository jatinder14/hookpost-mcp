// Runs the built CLI (dist/index.js) against a local stand-in for the
// Hookpost API and checks what it sends and prints. `npm test` builds first.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFile } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const CLI = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'index.js');
const KEY = 'test-key-123';
const requests = [];
let server;
let host;
let polls = 0;

const json = (res, status, body) => {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};

before(async () => {
  server = createServer(async (req, res) => {
    const chunks = [];
    for await (const ch of req) chunks.push(ch);
    const raw = Buffer.concat(chunks);
    const body = (req.headers['content-type'] || '').includes('json') && raw.length ? JSON.parse(raw) : raw.toString('latin1');
    requests.push({ method: req.method, url: req.url, auth: req.headers.authorization, body, type: req.headers['content-type'] });
    const url = req.url;

    if (url === '/api/cli-auth/device') {
      polls = 0;
      return json(res, 200, {
        device_code: 'd'.repeat(64),
        user_code: 'BCDF-GHJK',
        verification_uri_complete: 'https://app.example/oauth/cli?code=BCDF-GHJK',
        expires_in: 30,
        interval: 1,
      });
    }
    if (url === '/api/cli-auth/token') {
      polls++;
      return polls < 2 ? json(res, 400, { error: 'authorization_pending' }) : json(res, 200, { api_key: KEY });
    }
    if (!url.startsWith('/api/public/v1/')) return json(res, 404, { msg: 'nope' });
    if (req.headers.authorization !== KEY) return json(res, 401, { msg: 'Invalid API key' });
    const path = url.slice('/api/public/v1'.length);

    if (path === '/is-connected') return json(res, 200, { connected: true });
    if (path === '/integrations')
      return json(res, 200, [{ id: 'ch-x', name: 'Jo', identifier: 'x', disabled: false }]);
    if (path === '/connect-link' && req.method === 'GET') return json(res, 200, { platforms: ['x', 'linkedin'] });
    if (path === '/connect-link' && req.method === 'POST') {
      if (body.platform !== 'linkedin') return json(res, 400, { msg: 'Unknown platform "myspace".', platforms: ['x', 'linkedin'] });
      return json(res, 200, { platform: 'linkedin', url: 'https://api.example/integrations/connect-link/abc', expiresAt: '2026-11-18T00:00:00.000Z' });
    }
    if (path.startsWith('/find-slot/')) return json(res, 200, { date: '2026-11-20T09:00:00.000Z' });
    if (path === '/upload') return json(res, 201, { id: 'm-1', path: 'https://cdn.example/m-1.png', name: 'shot.png' });
    if (path === '/upload-from-url') return json(res, 201, { id: 'm-2', path: 'https://cdn.example/m-2.png' });
    if (path === '/posts' && req.method === 'POST')
      return json(res, 201, body.posts.map((p, i) => ({ postId: `p-${i}`, integration: p.integration.id, previewUrl: `https://app.example/p/p-${i}?share=true` })));
    if (path === '/posts/p-0/preview') return json(res, 200, { id: 'p-0', previewUrl: 'https://app.example/p/p-0?share=true' });
    if (path.startsWith('/analytics/ch-x')) return json(res, 200, [{ label: 'Impressions', data: [{ total: 5 }, { total: 7 }] }]);
    return json(res, 404, { msg: `no route ${req.method} ${path}` });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  host = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => server.close());

const run = (args, { home, env = {}, input } = {}) =>
  new Promise((resolve) => {
    const child = execFile(
      process.execPath,
      [CLI, ...args],
      { env: { PATH: process.env.PATH, HOME: home || mkdtempSync(join(tmpdir(), 'hp-')), HOOKPOST_API_URL: host, NO_COLOR: '1', ...env } },
      (err, stdout, stderr) => resolve({ code: err ? err.code : 0, stdout, stderr })
    );
    if (input !== undefined) {
      child.stdin.end(input);
    }
  });

const signedIn = { HOOKPOST_API_KEY: KEY };
const last = (pred) => [...requests].reverse().find(pred);

test('login runs the device flow, prints the code and saves the key owner-only', async () => {
  const home = mkdtempSync(join(tmpdir(), 'hp-'));
  const r = await run(['login', '--no-open'], { home });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /BCDF-GHJK/);
  assert.match(r.stdout, /oauth\/cli\?code=BCDF-GHJK/);
  const file = join(home, '.hookpost', 'config.json');
  assert.equal(JSON.parse(readFileSync(file, 'utf8')).apiKey, KEY);
  assert.equal(statSync(file).mode & 0o777, 0o600);
});

test('login --key verifies the key before saving it', async () => {
  const bad = await run(['login', '--key', 'wrong']);
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /Invalid API key/);
  const good = await run(['login', '--key', KEY, '--json']);
  assert.equal(good.code, 0);
  assert.equal(JSON.parse(good.stdout).signedIn, true);
});

test('auth login still asks for the key, then the host (0.1 scripts)', async () => {
  const r = await run(['auth', 'login'], { input: `${KEY}\n${host}\n` });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /Signed in/);
});

test('channels --json is the API list, parseable', async () => {
  const r = await run(['channels', '--json'], { env: signedIn });
  assert.equal(r.code, 0);
  assert.deepEqual(JSON.parse(r.stdout)[0].id, 'ch-x');
});

test('errors in --json are JSON on stdout with exit 1', async () => {
  const r = await run(['channels', '--json'], { env: { HOOKPOST_API_KEY: 'nope' } });
  assert.equal(r.code, 1);
  assert.deepEqual(JSON.parse(r.stdout), { error: 'Invalid API key', status: 401 });
});

test('connect makes a link; connect with no platform lists them; a bad one says why', async () => {
  const link = await run(['connect', 'linkedin'], { env: signedIn });
  assert.match(link.stdout, /connect-link\/abc/);
  const list = await run(['connect', '--json'], { env: signedIn });
  assert.deepEqual(JSON.parse(list.stdout).platforms, ['x', 'linkedin']);
  const bad = await run(['connect', 'myspace'], { env: signedIn });
  assert.equal(bad.code, 1);
  assert.match(bad.stderr, /Unknown platform/);
});

test('post --draft sends a CLI draft with a thread follow-up and prints the preview link', async () => {
  const r = await run(['post', 'Hello world', '--channel', 'ch-x', '--draft', '--thread', 'Second part'], { env: signedIn });
  assert.equal(r.code, 0, r.stderr);
  assert.match(r.stdout, /preview: https:\/\/app\.example\/p\/p-0\?share=true/);
  const sent = last((q) => q.url.endsWith('/posts') && q.method === 'POST').body;
  assert.equal(sent.type, 'draft');
  assert.equal(sent.creationMethod, 'CLI');
  assert.deepEqual(sent.posts[0].value.map((v) => v.content), ['Hello world', 'Second part']);
});

test('post with no --at uses the next free slot; schedule requires --at', async () => {
  const r = await run(['post', 'Hi', '--channel', 'ch-x', '--json'], { env: signedIn });
  assert.equal(JSON.parse(r.stdout).date, '2026-11-20T09:00:00.000Z');
  const s = await run(['schedule', 'Hi', '--channel', 'ch-x'], { env: signedIn });
  assert.equal(s.code, 1);
  assert.match(s.stderr, /--at/);
});

test('--at without a zone is sent as UTC', async () => {
  await run(['schedule', 'Hi', '--channel', 'ch-x', '--at', '2026-12-01T09:30:00'], { env: signedIn });
  assert.equal(last((q) => q.url.endsWith('/posts')).body.date, '2026-12-01T09:30:00Z');
});

test('--media uploads a local file (multipart) and a URL, then attaches both', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'hp-'));
  const file = join(dir, 'shot.png');
  writeFileSync(file, Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  const r = await run(['post', 'Pic', '--channel', 'ch-x', '--draft', '--media', file, '--media', 'https://example.com/a.png'], { env: signedIn });
  assert.equal(r.code, 0, r.stderr);
  assert.match(last((q) => q.url.endsWith('/upload')).type, /multipart\/form-data/);
  assert.deepEqual(last((q) => q.url.endsWith('/posts')).body.posts[0].value[0].image, [
    { id: 'm-1', path: 'https://cdn.example/m-1.png' },
    { id: 'm-2', path: 'https://cdn.example/m-2.png' },
  ]);
});

test('preview, analytics and mcp', async () => {
  const p = await run(['preview', 'p-0'], { env: signedIn });
  assert.equal(p.stdout.trim(), 'https://app.example/p/p-0?share=true');
  const a = await run(['analytics', 'ch-x', '--days', '30'], { env: signedIn });
  assert.match(a.stdout, /Impressions\s+12/);
  assert.match(last((q) => q.url.startsWith('/api/public/v1/analytics')).url, /date=30/);
  const m = await run(['mcp', 'claude-code']);
  assert.match(m.stdout, /claude mcp add --transport http hookpost https:\/\/hookpost\.hookstep\.in\/api\/mcp/);
});

test('settings for several channels at once is refused', async () => {
  const r = await run(['post', 'x', '--channel', 'a,b', '--settings', '{"title":"t"}', '--draft'], { env: signedIn });
  assert.equal(r.code, 1);
  assert.match(r.stderr, /single channel/);
});
