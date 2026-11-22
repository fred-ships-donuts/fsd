// Validação, pacote 1 (segunda parte): a tarefa entregue não volta (R44); o fim do dia desistido solta o papel (R27); a tarefa leva o
// head (R45); o hook grava o contexto no fim do turno (R11); o rate limit numa sessão de papel pede a pausa na pasta dele (R12); o
// cartão de antes volta quando o turno não abre (R23).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'wp1b-'));
const D = await import('./fsd-dispatch-loop.mjs');
const { decide } = await import('./fsd-dispatch.mjs');
const M = await import('./fsd-messenger.mjs');
const T = await import('./fsd-task.mjs');
const U = await import('./fsd-usage.mjs');
const fresh = () => { delete process.env.FSD_STATE_ROOT; process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'wp1b-')); };
const T0 = Date.parse('2026-11-22T12:00:00Z'), MIN = 60000;
const off = { state: 'off' }, team = (o = {}) => ({ kevin: off, mel: off, stuart: off, bob: off, ...o });
const g = (o = {}) => async () => ({ sessions: team(), cards: [], messages: [], deadlocks: [], ...o });

test('R44: a task with a valid delivery does not expire with the lease, so it is not sent again', async () => {
  fresh(); const calls = [], exec = async (a) => calls.push(a);
  await D.round({ gather: g({ cards: [{ n: 5, column: 'devReady' }] }), exec, now: T0 });
  const later = T0 + 121 * MIN;
  await D.round({ gather: g({ cards: [{ n: 5, column: 'devReady' }] }), exec, now: later, cfg: { delivered: (r, t) => r === 'stuart' && t.n === 5 } });
  assert.equal(calls.length, 1);
  await D.round({ gather: g({ cards: [{ n: 5, column: 'devReady' }] }), exec, now: later, cfg: { delivered: () => false } });
  assert.equal(calls.length, 2);   // sem entrega, o lease vence e a tarefa volta
});

test('R27: an end of day given up (eodHold) neither asks again nor retires, and the role gets its task', () => {
  const s = { endOfDayAt: 100, sessions: team({ mel: { state: 'idle', id: 'a1', ctx: 500, eodHold: true } }), cards: [{ n: 3, column: 'archReady' }] };
  const acts = decide(s);
  assert.deepEqual(acts.map((a) => a.type), ['turn']); assert.equal(acts[0].task.n, 3);
  assert.deepEqual(decide({ ...s, sessions: team({ mel: { state: 'idle', id: 'a1', ctx: 500 } }) }).map((a) => a.type), ['endofday']);
});

test('R45: the review and QA tasks carry the head of the PR', () => {
  const acts = decide({ sessions: team(), cards: [{ n: 9, column: 'review', pr: 20, head: 'abc1234' }], maxConcurrent: 2 });
  assert.deepEqual(acts.map((a) => `${a.to}:${a.task.head}`), ['mel:abc1234', 'bob:abc1234']);
});

test('R11: the Stop hook records the context of the conversation from the transcript', () => {
  fresh(); const tr = join(process.env.FSD_STATE, 't.jsonl');
  writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { usage: { input_tokens: 10, cache_read_input_tokens: 1000, output_tokens: 5 } } }) + '\n');
  assert.equal(M.hook('Stop', { session_id: 's9', transcript_path: tr }, 'kevin'), null);
  assert.deepEqual([M.sessionState('kevin').state, M.sessionState('kevin').ctx], ['idle', 1015]);
  M.hook('StopFailure', { session_id: 's9' }, 'kevin'); assert.equal(M.sessionState('kevin').ctx, undefined);
});

test('R12: a rate limit in a role session asks for the pause in its own folder; outside the native team, the PAUSE as before', () => {
  const root = mkdtempSync(join(tmpdir(), 'wp1b-root-')); mkdirSync(join(root, 'bob'));
  process.env.FSD_STATE_ROOT = root; process.env.FSD_STATE = join(root, 'bob');
  const env = { FSD_RUNNER: process.env.FSD_RUNNER, FSD_AGENT: process.env.FSD_AGENT };
  process.env.FSD_RUNNER = 'session'; process.env.FSD_AGENT = 'bob'; process.env.FSD_DRY = '1';
  try {
    const cfg = { refreshSeconds: 60, stopPct: 90 };
    assert.equal(U.stopFailure(cfg), true);
    assert.equal(existsSync(join(root, 'bob', 'PAUSE.request')), true); assert.equal(existsSync(join(root, 'PAUSE')), false);
  } finally { for (const [k, v] of Object.entries(env)) { if (v === undefined) delete process.env[k]; else process.env[k] = v; } delete process.env.FSD_DRY; }
});

test('R23: snapshot and restore give back the card and the task of before (and remove what did not exist)', () => {
  fresh();
  T.saveCard('stuart', 'cartão velho', { kind: 'correcao', n: 4 }); const snap = T.snapshot('stuart');
  T.saveCard('stuart', 'cartão novo', { kind: 'entrega-codigo', n: 8 });
  T.restore('stuart', snap); assert.equal(T.loadCard('stuart'), 'cartão velho'); assert.equal(T.loadTask('stuart').n, 4);
  const none = T.snapshot('bob'); T.saveCard('bob', 'x', { kind: 'qa', n: 1 }); T.restore('bob', none);
  assert.equal(T.loadCard('bob'), ''); assert.equal(T.loadTask('bob'), null);
});
