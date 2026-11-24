// F2.3 (T2.3.1): o broker mantém um token por papel e o do supervisor, com o body da tabela, e só renova perto de vencer. As
// permissões entre usuários (só o papel lê o próprio token; C1) são K8, no simulate-container.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { spawn, spawnSync } from 'node:child_process';
import { generateKeyPairSync } from 'node:crypto';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
const CFG = JSON.parse(readFileSync(join(BIN, '..', 'agents.json'), 'utf8'));
const run = (args, env) => new Promise((res) => { const p = spawn(join(BIN, 'fsd-broker'), args, { env: { ...process.env, ...env } }); let o = ''; p.stdout.on('data', (b) => (o += b)); p.on('close', (code) => res({ code, out: o })); });
const world = async () => {
  const seen = [];
  const s = await new Promise((r) => { const x = createServer((req, resp) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => { seen.push({ url: req.url, body: JSON.parse(b) }); resp.writeHead(201, { 'content-type': 'application/json' }); resp.end(JSON.stringify({ token: `tok-${seen.length}`, expires_at: new Date(Date.now() + 3600e3).toISOString() })); }); }); x.listen(0, '127.0.0.1', () => r(x)); });
  const keys = mkdtempSync(join(tmpdir(), 'bk-')), dir = mkdtempSync(join(tmpdir(), 'bt-'));
  const pem = generateKeyPairSync('rsa', { modulusLength: 2048 }).privateKey.export({ type: 'pkcs8', format: 'pem' });
  for (const a of Object.values(CFG.agents)) writeFileSync(join(keys, `${a.slug}.pem`), pem);
  for (const r of [...Object.keys(CFG.agents), 'dispatch']) mkdirSync(join(dir, r));
  return { s, seen, env: { FSD_BROKER_KEYS: keys, FSD_TOKEN_DIR: dir, FSD_GITHUB_API: `http://127.0.0.1:${s.address().port}`, FSD_BROKER_FAKE: '' }, dir };
};

test('once: token and token-org per role (0440) and the supervisor tokens (merge and board), with the table bodies; fresh ones are kept', async () => {
  const w = await world();
  try {
    const r = await run(['once'], w.env); assert.equal(r.code, 0); assert.doesNotMatch(r.out, /falhou|sem /);
    assert.equal(w.seen.length, Object.keys(CFG.agents).length * 2 + 2);
    for (const role of Object.keys(CFG.agents)) {
      assert.match(readFileSync(join(w.dir, role, 'token'), 'utf8'), /^tok-\d+\n$/);
      assert.equal(statSync(join(w.dir, role, 'token')).mode & 0o777, 0o440);
    }
    assert.ok(w.seen.some((x) => JSON.stringify(x.body) === JSON.stringify({ repositories: ['fsd'], permissions: CFG.tokens.repo.bob })));
    assert.ok(w.seen.every((x) => !x.body.permissions.workflows));
    // validação R10: o supervisor lê o quadro, então também tem o token-org
    for (const f of ['token', 'token-org']) assert.match(readFileSync(join(w.dir, 'dispatch', f), 'utf8'), /^tok-\d+\n$/);
    const again = await run(['once'], w.env); assert.equal(w.seen.length, Object.keys(CFG.agents).length * 2 + 2); assert.match(again.out, /fresco/);
  } finally { w.s.close(); }
});

test('a role folder that does not exist is reported, not created', async () => {
  const w = await world();
  try { (await import('node:fs')).rmSync(join(w.dir, 'mel'), { recursive: true }); const r = await run(['once'], w.env); assert.match(r.out, /mel: sem /); }
  finally { w.s.close(); }
});

test('fsd-token-file refuses a user that is not fsd-<role>, whatever FSD_AGENT says', () => {
  const who = mkdtempSync(join(tmpdir(), 'id-')); writeFileSync(join(who, 'id'), '#!/bin/sh\necho alguem\n', { mode: 0o755 });   // vale também rodando como fsd-<papel>
  const r = spawnSync(join(BIN, 'fsd-token-file'), [], { encoding: 'utf8', env: { ...process.env, PATH: `${who}:${process.env.PATH}`, FSD_AGENT: 'mel', FSD_RUNNER: 'session' } });
  assert.equal(r.status, 2); assert.match(r.stderr, /não é um usuário de papel/);
});
