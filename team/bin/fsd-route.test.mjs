// F3.4 (T3.4.4): negação vira aviso ao Kevin e registro; dúvida técnica vai à Mel, de fluxo ao Kevin, e a do autor vira
// "Deadlock: author decision needed" no ref. Cada tipo gera o encaminhamento certo.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'route-'));
const { route, apply, authorComment } = await import('./fsd-route.mjs');
const M = await import('./fsd-messenger.mjs');

const to = (acts) => acts.map((a) => `${a.type}:${a.to || a.ref || a.file || ''}`);
const TABLE = [
  [{ type: 'denial', agent: 'stuart', command: 'git push origin main', reason: 'deny' }, ['message:kevin', 'log:denials.jsonl']],
  [{ type: 'denial', agent: 'kevin', command: 'rm -rf /' }, ['log:denials.jsonl']],
  [{ type: 'doubt', agent: 'stuart', topic: 'tecnica', text: 'mergeGate ou fsd-merge?' }, ['message:mel']],
  [{ type: 'doubt', agent: 'mel', topic: 'tecnica', text: 'x' }, ['message:kevin']],
  [{ type: 'doubt', agent: 'bob', topic: 'fluxo', text: 'pego o #7 ou o #8?' }, ['message:kevin']],
  [{ type: 'doubt', agent: 'kevin', topic: 'fluxo', text: 'release agora?', ref: '#40' }, ['comment:#40']],
  [{ type: 'doubt', agent: 'stuart', topic: 'autor', text: 'pode mudar a main?', ref: '#12' }, ['comment:#12']],
  [{ type: 'doubt', agent: 'stuart', topic: 'autor', text: 'sem ref' }, ['error:']],
  [{ type: 'doubt', agent: 'stuart', topic: 'outro', text: 'x' }, ['error:']],
  [{ type: 'nada' }, ['error:']],
];
for (const [ev, expect] of TABLE) test(`route ${ev.type}/${ev.topic || ev.agent} → ${expect.join(', ')}`, () => assert.deepEqual(to(route(ev)), expect));

test('the author comment has the deadlock header the author watches for', () => {
  const c = authorComment({ agent: 'stuart', text: 'pode?', ref: '#12', author: 'fredericojacobi' });
  assert.match(c, /^\*\*Deadlock: author decision needed\*\*\n\n@fredericojacobi stuart needs your decision on #12\./);
  assert.match(c, /Decision \(author, <date>\)/);
});

test('apply: the message goes out through the messenger with the asker as sender; the denial is logged', async () => {
  const out = await apply(route({ type: 'denial', agent: 'stuart', command: 'git push origin main' }), { agent: 'stuart' });
  assert.deepEqual(out, ['para kevin', 'registrado em denials.jsonl']);
  const { messages } = M.collect({ uidToRole: null });
  assert.equal(messages[0].from, 'stuart'); assert.equal(messages[0].to, 'kevin'); assert.match(messages[0].text, /git push origin main/);
  assert.equal(JSON.parse(readFileSync(join(process.env.FSD_STATE, 'denials.jsonl'), 'utf8')).agent, 'stuart');
});

const duvida = (args, env = {}) => spawnSync(join(BIN, 'fsd-duvida'), args, { encoding: 'utf8', env: { ...process.env, FSD_AGENT: 'bob', FSD_DRY: '1', ...env } });
test('fsd-duvida end to end (dry): fluxo → Kevin outbox; autor → the gh comment; bad usage → 2', () => {
  process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'route-'));
  const r = duvida(['fluxo', 'pego o #7?', '--ref', '#7'], { FSD_STATE: process.env.FSD_STATE });
  assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /para kevin/);
  assert.equal(readdirSync(M.outboxDir('bob')).length, 1);
  const a = duvida(['autor', 'pode mudar a main?', '--ref', '#12']); assert.equal(a.status, 0); assert.match(a.stdout, /\[dry\] gh issue comment 12 --body-file -/);
  assert.equal(duvida(['autor', 'sem ref']).status, 1);
  assert.equal(duvida(['tecnica']).status, 2); assert.equal(duvida(['tecnica', 'x', '--ref', '12']).status, 2);
});

test('fsd-denied-hook tells Kevin only in a session runner', () => {
  const st = mkdtempSync(join(tmpdir(), 'route-'));
  const ev = JSON.stringify({ hook_event_name: 'PermissionDenied', session_id: 's', tool_use_id: 't', tool_name: 'Bash', tool_input: { command: 'git push origin main' }, cwd: '/tmp' });
  const hook = (runner) => spawnSync(join(BIN, 'fsd-denied-hook'), { input: ev, encoding: 'utf8', env: { ...process.env, FSD_STATE: st, FSD_AGENT: 'stuart', FSD_RUNNER: runner } });
  assert.equal(hook('').status, 0); assert.throws(() => readdirSync(join(st, 'outbox')));
  assert.equal(hook('session').status, 0); assert.equal(readdirSync(join(st, 'outbox', 'stuart')).length, 1);
});
