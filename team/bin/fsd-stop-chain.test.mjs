// Validação R29: na sessão nova as portas do Stop formam uma corrente, e o idle só é gravado quando nenhuma bloqueia. R26: a porta da
// entrega não bloqueia com lease ativo nem no fechamento do dia, avisa o Kevin uma vez e limpa o cartão quando a entrega vale.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'stopchain-'));
const M = await import('./fsd-messenger.mjs');
const T = await import('./fsd-task.mjs');
const Ls = await import('./fsd-lease.mjs');
const fresh = () => { delete process.env.FSD_STATE_ROOT; process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'stopchain-')); };
const withRunner = (fn) => { const keep = process.env.FSD_RUNNER; process.env.FSD_RUNNER = 'session'; try { return fn(); } finally { if (keep === undefined) delete process.env.FSD_RUNNER; else process.env.FSD_RUNNER = keep; } };

test('R29: the chain runs the guards in order and the first block wins; outside the new session it does nothing', () => {
  const calls = [];
  const run = (out) => (g) => { calls.push(g); return { stdout: out[g] || '' }; };
  assert.equal(M.stopChain({}, { run: run({}) }), null); assert.deepEqual(calls, []);   // sem FSD_RUNNER=session
  withRunner(() => {
    assert.deepEqual(M.stopChain({}, { run: run({ 'fsd-stop-guard': '{"decision":"block","reason":"r"}' }) }), { decision: 'block', reason: 'r' });
    assert.deepEqual(calls, ['fsd-context-guard', 'fsd-stop-guard']);
    calls.length = 0;
    assert.equal(M.stopChain({}, { run: run({ 'fsd-context-guard': 'lixo' }) }), null); assert.equal(calls.length, 2);
  });
});

test('R29: the real guards called by Claude in parallel stay quiet on Stop in the new session (the chain calls them)', async () => {
  const { spawnSync } = await import('node:child_process'); const BIN = dirname(new URL(import.meta.url).pathname);
  for (const g of M.STOP_GUARDS) {
    const r = spawnSync(join(BIN, g), { input: JSON.stringify({ hook_event_name: 'Stop', session_id: 'x', last_assistant_message: 'Posso seguir?' }), encoding: 'utf8', env: { ...process.env, FSD_RUNNER: 'session', FSD_AGENT: 'stuart' } });
    assert.equal(r.status, 0); assert.equal(r.stdout.trim(), '', g);
  }
});

test('R26: no block while the role waits for a colleague (active lease) or in the end-of-day turn', () => {
  fresh(); T.saveCard('stuart', 'c', { kind: 'entrega-codigo', n: 5 });
  assert.equal(M.hook('Stop', {}, 'stuart').decision, 'block');
  Ls.take('stuart', { for: 'mel', what: 'plano', ref: '#5', min: 30 });
  assert.equal(M.hook('Stop', {}, 'stuart'), null); Ls.release('stuart');
  mkdirSync(dirname(M.eodFile('stuart')), { recursive: true }); writeFileSync(M.eodFile('stuart'), 'x');
  assert.equal(M.hook('Stop', {}, 'stuart'), null);
});

test('R26: after the last block Kevin is told once, and a valid delivery clears the card', () => {
  fresh(); T.saveCard('bob', 'c', { kind: 'qa', n: 6 });
  for (let i = 0; i < M.MAX_BLOCKS; i++) assert.equal(M.hook('Stop', {}, 'bob').decision, 'block');
  assert.equal(M.hook('Stop', {}, 'bob'), null); assert.equal(M.hook('Stop', {}, 'bob'), null);
  assert.equal(readdirSync(M.outboxDir('bob')).length, 1);   // um aviso só ao Kevin
  const d = join(process.env.FSD_STATE, 'entregas', 'qa'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, '6-x.json'), '{}');
  assert.equal(M.hook('Stop', {}, 'bob'), null);
  assert.equal(T.loadCard('bob'), ''); assert.equal(existsSync(join(process.env.FSD_STATE, 'session-state', 'bob.task.json')), false);
});

test('R31: waitIdle waits for the Stop of the new conversation, not of an older one, and gives up at the deadline', async () => {
  const { waitIdle } = await import('./fsd-eval.mjs');
  let t = 0; const states = [null, { state: 'working', session_id: 's2' }, { state: 'idle', session_id: 's1' }, { state: 'idle', session_id: 's2' }];
  let i = 0; const opts = { now: () => t, sleep: async (ms) => { t += ms; i++; }, pollMs: 10, timeoutMs: 1000 };
  assert.equal(await waitIdle({ ...opts, state: () => states[Math.min(i, 3)], sid: 's2' }), true); assert.equal(i, 3);
  t = 0; assert.equal(await waitIdle({ ...opts, state: () => ({ state: 'working', session_id: 's2' }), sid: 's2' }), false); assert.equal(t >= 1000, true);
});
