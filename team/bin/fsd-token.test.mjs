// fsd-token (F1.6): body com repositories/permissions por papel, timeout, .tmp único e URL substituível. Sem api.github.com:
// um servidor local guarda o body e responde um token; outro nunca responde.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(BIN, '..', 'agents.json'), 'utf8'));
const state = () => {
  const d = mkdtempSync(join(tmpdir(), 'tok-')); mkdirSync(join(d, 'keys'));
  const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  for (const a of Object.values(CFG.agents)) writeFileSync(join(d, 'keys', `${a.slug}.pem`), pem);
  return d;
};
const run = (args, env) => new Promise((res) => {
  const p = spawn(join(BIN, 'fsd-token'), args, { env: { ...process.env, FSD_REPO_SLUG: '', ...env } }); let out = '', err = '';
  p.stdout.on('data', (b) => (out += b)); p.stderr.on('data', (b) => (err += b)); p.on('close', (code) => res({ code, out: out.trim(), err }));
});
const server = (handler) => new Promise((res) => { const s = createServer(handler); s.listen(0, '127.0.0.1', () => res(s)); });
const recorder = async () => {
  const seen = [];
  const s = await server((req, resp) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => {
    seen.push({ url: req.url, body: JSON.parse(b || 'null') });
    resp.writeHead(201, { 'content-type': 'application/json' }); resp.end(JSON.stringify({ token: `tok-${seen.length}`, expires_at: new Date(Date.now() + 3600e3).toISOString() }));
  }); });
  return { s, seen, url: `http://127.0.0.1:${s.address().port}` };
};

test('the body matches the table: repositories = [fsd], permissions of the role; never workflows', async () => {
  const r = await recorder(); const d = state();
  try {
    for (const name of Object.keys(CFG.agents)) {
      const o = await run([name], { FSD_STATE: d, FSD_GITHUB_API: r.url });
      assert.equal(o.code, 0, o.err);
      const last = r.seen.at(-1);
      assert.equal(last.url, `/app/installations/${CFG.agents[name].installation_id}/access_tokens`);
      assert.deepEqual(last.body, { repositories: ['fsd'], permissions: CFG.tokens.repo[name] });
      assert.equal(last.body.permissions.workflows, undefined);
    }
    assert.equal(CFG.tokens.repo.bob.contents, 'read');
    await run(['bob', 'org'], { FSD_STATE: d, FSD_GITHUB_API: r.url });
    assert.deepEqual(r.seen.at(-1).body, { repositories: ['fsd'], permissions: CFG.tokens.org });
  } finally { r.s.close(); }
});

test('the cache is reused only for the same body; no .tmp is left behind', async () => {
  const r = await recorder(); const d = state();
  try {
    const a = await run(['stuart'], { FSD_STATE: d, FSD_GITHUB_API: r.url });
    const b = await run(['stuart'], { FSD_STATE: d, FSD_GITHUB_API: r.url });
    assert.equal(a.out, b.out); assert.equal(r.seen.length, 1);
    const f = join(d, 'cache', 'stuart.json'); const c = JSON.parse(readFileSync(f, 'utf8'));
    writeFileSync(f, JSON.stringify({ ...c, body: '{"permissions":{"workflows":"write"}}' }));   // token cunhado com outro body
    assert.equal((await run(['stuart'], { FSD_STATE: d, FSD_GITHUB_API: r.url })).out, 'tok-2');
    const both = await Promise.all([run(['mel'], { FSD_STATE: d, FSD_GITHUB_API: r.url }), run(['mel'], { FSD_STATE: d, FSD_GITHUB_API: r.url })]);
    assert.deepEqual(both.map((x) => x.code), [0, 0]);
    assert.deepEqual(readdirSync(join(d, 'cache')).filter((x) => x.endsWith('.tmp')), []);
  } finally { r.s.close(); }
});

test('stalled network: fails with code 3, well under 15 s', async () => {
  const s = await server(() => {});   // aceita e nunca responde
  try {
    const t = Date.now();
    const o = await run(['kevin'], { FSD_STATE: state(), FSD_GITHUB_API: `http://127.0.0.1:${s.address().port}`, FSD_TOKEN_TIMEOUT_MS: '800' });
    assert.equal(o.code, 3); assert.match(o.err, /sem resposta.*timeout/);
    assert.ok(Date.now() - t < 5000);
    assert.match(readFileSync(join(BIN, 'fsd-token'), 'utf8'), /FSD_TOKEN_TIMEOUT_MS\) \|\| 10000/);   // padrão de 10 s < 15 s
  } finally { s.closeAllConnections(); s.close(); }
});

test('an unknown agent is refused before any request', async () => {
  const o = await run(['nobody'], { FSD_STATE: state(), FSD_GITHUB_API: 'http://127.0.0.1:9' });
  assert.equal(o.code, 2); assert.match(o.err, /agente desconhecido/);
});
