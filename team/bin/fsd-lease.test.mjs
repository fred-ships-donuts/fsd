// F3.4 (T3.4.3): esperas viram leases; findDeadlocks lê os leases; o impasse aciona o juiz pelo decide(). Os casos de impasse do
// fsd-wait (README, "Detector de impasse") passam sobre os leases.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'lease-'));
const Ls = await import('./fsd-lease.mjs');
const { decide } = await import('./fsd-dispatch.mjs');
const T0 = Date.parse('2026-11-21T12:00:00Z'), MIN = 60000;
const fresh = () => { process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'lease-')); };
const quietSince = (t) => () => t;   // activityOf: última atividade do ref

test('take / list / release; the newest lease of an agent replaces the old one; expired ones vanish', () => {
  fresh();
  Ls.take('stuart', { for: 'mel', what: 'plano', ref: '#7', min: 30, now: T0 });
  Ls.take('stuart', { for: 'bob', what: 'QA', ref: '#7', min: 30, now: T0 });
  assert.deepEqual(Ls.list(T0 + MIN).map((l) => `${l.agent}>${l.for}`), ['stuart>bob']);
  assert.deepEqual(Ls.list(T0 + 31 * MIN), []); assert.equal(existsSync(join(Ls.leaseDir(), 'stuart.json')), false);
  Ls.take('mel', { for: 'kevin', what: 'x', ref: '#8', now: T0 }); assert.equal(Ls.release('mel'), true); assert.equal(Ls.release('mel'), false);
  assert.throws(() => Ls.take('mel', { for: 'mel', ref: '#1' })); assert.throws(() => Ls.take('mel', { for: 'eve', ref: '#1' })); assert.throws(() => Ls.take('mel', { for: 'bob', ref: '7' }));
});

test('forged or broken lease files are dropped', () => {
  fresh(); mkdirSync(Ls.leaseDir(), { recursive: true });
  writeFileSync(join(Ls.leaseDir(), 'bob.json'), JSON.stringify({ agent: 'kevin', for: 'mel', ref: '#1', since: 'x', until: '2099-01-01T00:00:00Z' }));   // nome ≠ agent
  writeFileSync(join(Ls.leaseDir(), 'eve.json'), '{}'); writeFileSync(join(Ls.leaseDir(), 'mel.json'), '{');
  assert.deepEqual(Ls.list(T0), []);
});

const cfg = { cycleMin: 10, stallMin: 30 };
test('cycle on the same ref, quiet for cycleMin → DEADLOCK → decide() calls the judge once', () => {
  fresh();
  Ls.take('stuart', { for: 'mel', what: 'plano', ref: '#7', now: T0 }); Ls.take('mel', { for: 'stuart', what: 'código', ref: '#7', now: T0 + MIN });
  const early = Ls.impasses(Ls.list(T0 + 5 * MIN), { now: T0 + 5 * MIN, activityOf: quietSince(T0), ...cfg });
  assert.deepEqual(early.deadlocks, []);
  const late = Ls.impasses(Ls.list(T0 + 12 * MIN), { now: T0 + 12 * MIN, activityOf: quietSince(T0), ...cfg });
  assert.deepEqual(late.deadlocks.map((d) => d.line), ['DEADLOCK #7: mel→stuart→mel']);
  assert.deepEqual(decide({ deadlocks: late.deadlocks }), [{ type: 'judge', ref: '#7' }]);
  assert.deepEqual(decide({ deadlocks: late.deadlocks, judged: ['#7'] }), []);
});

test('activity on the ref (comment, review, push) keeps a cycle from being a deadlock', () => {
  fresh();
  Ls.take('stuart', { for: 'mel', ref: '#7', now: T0 }); Ls.take('mel', { for: 'stuart', ref: '#7', now: T0 });
  assert.deepEqual(Ls.impasses(Ls.list(T0 + 12 * MIN), { now: T0 + 12 * MIN, activityOf: quietSince(T0 + 8 * MIN), ...cfg }).deadlocks, []);
});

test('waits on different refs are no cycle; all waiting with no cycle and no activity → STALLED (not the judge)', () => {
  fresh();
  Ls.take('stuart', { for: 'mel', ref: '#7', now: T0 }); Ls.take('mel', { for: 'stuart', ref: '#8', now: T0 });
  assert.deepEqual(Ls.impasses(Ls.list(T0 + 12 * MIN), { now: T0 + 12 * MIN, activityOf: quietSince(T0), ...cfg }).deadlocks, []);
  fresh(); Ls.take('bob', { for: 'stuart', what: 'fix', ref: '#9', now: T0 });
  const r = Ls.impasses(Ls.list(T0 + 31 * MIN), { now: T0 + 31 * MIN, activityOf: quietSince(T0), ...cfg });
  assert.deepEqual(r.deadlocks, []); assert.equal(r.stalled[0].kind, 'STALLED');
});

test('a three-way cycle is found and the expired lease breaks it', () => {
  fresh();
  Ls.take('stuart', { for: 'mel', ref: '#7', min: 15, now: T0 }); Ls.take('mel', { for: 'bob', ref: '#7', now: T0 }); Ls.take('bob', { for: 'stuart', ref: '#7', now: T0 });
  assert.equal(Ls.impasses(Ls.list(T0 + 12 * MIN), { now: T0 + 12 * MIN, activityOf: quietSince(T0), ...cfg }).deadlocks[0].line, 'DEADLOCK #7: bob→stuart→mel→bob');
  assert.deepEqual(Ls.impasses(Ls.list(T0 + 16 * MIN), { now: T0 + 16 * MIN, activityOf: quietSince(T0), ...cfg }).deadlocks, []);
});

test('fsd-espera end to end', () => {
  fresh();
  const run = (args, agent = 'stuart') => spawnSync(join(BIN, 'fsd-espera'), args, { encoding: 'utf8', env: { ...process.env, FSD_AGENT: agent } });
  assert.equal(run(['mel', 'o plano', '--ref', '#7', '--min', '20']).status, 0);
  assert.deepEqual(Ls.list().map((l) => `${l.agent}>${l.for}@${l.ref}`), ['stuart>mel@#7']);
  assert.equal(run(['fim']).status, 0); assert.deepEqual(Ls.list(), []);
  assert.equal(run(['mel', 'x']).status, 2); assert.equal(run(['eve', 'x', '--ref', '#1']).status, 1);
});
