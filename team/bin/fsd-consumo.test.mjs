// T6.3.4 e T6.5.1: o custo de cada turno, o histórico de colunas e os relatórios, sobre estado temporário (0 token).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as C from './fsd-consumo.mjs';
const BIN = dirname(fileURLToPath(import.meta.url));
const dir = () => mkdtempSync(join(tmpdir(), 'cons-'));
const lines = (d, f) => (existsSync(join(d, f)) ? readFileSync(join(d, f), 'utf8').trim().split('\n').map((l) => JSON.parse(l)) : []);
const rec = (state, cost, o = {}) => C.recordTurns({ state, roles: ['mel', 'stuart'], sessions: {}, tasks: {}, now: 1, ...o, cost: (r) => cost[r] ?? null });

test('delta: the difference inside a session; a new session or a total that shrank counts whole; nothing new is no turn', () => {
  const c = (session, usd, ms) => ({ session, usd, ms });
  assert.deepEqual(C.delta(null, c('a', 0.5, 2000)), { usd: 0.5, seconds: 2 });
  assert.deepEqual(C.delta(c('a', 0.5, 2000), c('a', 0.8, 5000)), { usd: 0.3, seconds: 3 });
  assert.deepEqual(C.delta(c('a', 0.5, 2000), c('b', 0.2, 1000)), { usd: 0.2, seconds: 1 });
  assert.deepEqual(C.delta(c('a', 0.5, 2000), c('a', 0.1, 900)), { usd: 0.1, seconds: 0.9 });
  assert.equal(C.delta(c('a', 0.5, 2000), c('a', 0.5, 2000)), null);
  assert.deepEqual(C.delta(c('a', 0.5, 2000), c('a', 0.6, null)), { usd: 0.1, seconds: null });
  assert.deepEqual(C.delta(c('a', 0.5, null), c('a', 0.6, 400)), { usd: 0.1, seconds: 0.4 });
  for (const bad of [null, {}, { session: 'a', usd: NaN }]) assert.equal(C.delta(null, bad), null);
});

test('recordTurns: one line per closed turn with role, card, model and cost; a working role waits; the same total is not counted twice', () => {
  const d = dir(), cost = { stuart: { session: 's1', model: 'claude-opus-5-5', usd: 0.4, ms: 60000 } }, tasks = { stuart: { n: 184, kind: 'entrega-codigo' } };
  assert.equal(rec(d, cost, { sessions: { stuart: { state: 'working' } }, tasks }).length, 0);
  assert.equal(rec(d, cost, { sessions: { stuart: { state: 'idle' } }, tasks }).length, 1); assert.equal(rec(d, cost, { tasks }).length, 0);
  cost.stuart = { ...cost.stuart, usd: 0.5, ms: 70000 }; cost.mel = { session: 'm', usd: 0.1, ms: 1000 }; rec(d, cost);
  assert.deepEqual(lines(d, 'consumo.jsonl').map((l) => [l.role, l.card, l.kind, l.model, l.usd, l.seconds]),
    [['stuart', 184, 'entrega-codigo', 'claude-opus-5-5', 0.4, 60], ['mel', null, null, null, 0.1, 1], ['stuart', null, null, 'claude-opus-5-5', 0.1, 10]]);
});

test('recordColumns: only changes are written; a card first seen in Done is not', () => {
  const d = dir(); const at = (t, ...c) => C.recordColumns({ state: d, now: t, cards: c.map(([n, column]) => ({ n, column })) });
  assert.equal(at(1, [1, 'devReady'], [2, 'done']), 1); assert.equal(at(2, [1, 'devReady']), 0); assert.equal(at(3, [1, 'dev']), 1); assert.equal(at(4, [1, 'done']), 1);
  assert.deepEqual(lines(d, 'colunas.jsonl'), [{ t: 1, n: 1, from: null, to: 'devReady' }, { t: 3, n: 1, from: 'devReady', to: 'dev' }, { t: 4, n: 1, from: 'dev', to: 'done' }]);
});

test('columnTime: from entering to leaving; an open card counts until now; Done does not grow', () => {
  const t = C.columnTime([{ t: 0, n: 1, to: 'dev' }, { t: 60000, n: 1, to: 'review' }, { t: 90000, n: 1, to: 'done' }, { t: 0, n: 2, to: 'dev' }], 100000);
  assert.deepEqual(t, { dev: 160, review: 30 });
});

test('fsd-stats consumo and painel: both models side by side, per card, and the four metrics; empty state and broken lines are fine', () => {
  const d = dir(); const run = (c) => { const r = spawnSync(join(BIN, 'fsd-stats'), [c], { encoding: 'utf8', env: { ...process.env, FSD_STATE: d, FSD_NOW: '7200000' } }); assert.equal(r.status, 0, r.stderr); return r.stdout; };
  assert.match(run('consumo'), /nenhum turno/); assert.match(run('painel'), /stuart +0 em 0 card\(s\) +0 +- +-/);
  const l = (o) => JSON.stringify({ t: 1, session: 's', card: 184, kind: 'k', seconds: 10, ...o });
  writeFileSync(join(d, 'consumo.jsonl'), [l({ role: 'kevin', model: 'claude-opus-5-5', usd: 0.13 }), l({ role: 'kevin', model: 'claude-opus-5-5', usd: 0.15 }), l({ role: 'kevin', model: 'claude-sonnet-5-5', usd: 0.05, seconds: null }), '{cortada', 'null', l({ role: 'mel', usd: 'x' })].join('\n'));
  const out = run('consumo'); assert.match(out, /kevin +claude-opus-5-5 +2 +US\$ 0,1400 +US\$ 0,1300 a US\$ 0,1500 +US\$ 0,2800 +10s/); assert.match(out, /kevin +claude-sonnet-5-5 +1 +US\$ 0,0500 .* -$/m); assert.match(out, /total US\$ 0,3300 · por card: #184 US\$ 0,3300/);
  writeFileSync(join(d, 'colunas.jsonl'), [{ t: 0, n: 184, to: 'dev' }, { t: 3600000, n: 184, to: 'review' }, { t: 3660000, n: 184, to: 'changes' }].map((x) => JSON.stringify(x)).join('\n'));
  mkdirSync(join(d, 'audit')); writeFileSync(join(d, 'audit', 'a.json'), JSON.stringify({ role: 'stuart', byRule: { 'passo-aberto': 2, 'comando-proibido': 1 } })); writeFileSync(join(d, 'audit', 'b.json'), '{');
  const p = run('painel'); assert.match(p, /stuart +1 em 1 card\(s\) +3 +- +dev 60min, changes 59min/); assert.match(p, /mel +- +0 +- +review 60s/); assert.match(p, /kevin +- +0 +US\$ 0,3300 em 3 turno\(s\)/);
});
