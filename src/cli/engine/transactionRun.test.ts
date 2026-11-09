import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { realOps } from './ops.js';
import { writeRun, tempEnv, journalOf, opsFailing, type TempEnv } from './testkit.js';
import { runTransaction, type PhaseEvent, type RunControl, type TransactionSpec } from './transactionRun.js';

type P = 'prepare' | 'apply';
const now = () => new Date(1_000_000);

let t: TempEnv;
beforeEach(() => (t = tempEnv()));
afterEach(() => t.cleanup());

// A tiny client: one phase after prepare, a created file and a staged folder moved in.
function spec(overrides: Partial<TransactionSpec<P, string>> = {}): TransactionSpec<P, string> {
  return {
    scope: 'project',
    env: t.env,
    label: 'demo',
    firstPhase: 'prepare',
    keepAncestors: false,
    verify: () => {},
    work: async (tx, { enter, step }) => {
      tx.ensureDirs(join(t.env.cwd, 'out'));
      await step();
      enter('apply');
      writeFileSync(join(t.env.cwd, 'staged.txt'), 's');
      tx.moveIn(join(t.env.cwd, 'staged.txt'), join(t.env.cwd, 'out/staged.txt'));
      await step();
    },
    result: () => 'ok',
    ...overrides,
  };
}

describe('runTransaction', () => {
  it('1. happy path: phases in order, result, run dir gone', async () => {
    const events: PhaseEvent<P>[] = [];
    const outcome = await runTransaction(spec(), { onEvent: (e) => events.push(e), now });
    assert.deepEqual(outcome, { status: 'done', result: 'ok', warnings: [] });
    assert.deepEqual(
      events.map((e) => `${e.phase}:${e.state}`),
      ['verify:running', 'verify:done', 'prepare:running', 'prepare:done', 'apply:running', 'apply:done', 'conclude:running', 'conclude:done'],
    );
    assert.equal(readFileSync(join(t.env.cwd, 'out/staged.txt'), 'utf8'), 's');
    assert.deepEqual(existsSync(join(t.env.cwd, '.fsd')) ? readdirSync(join(t.env.cwd, '.fsd')) : [], []);
  });

  it('2a. a failure in verify() is reported in verify and creates nothing', async () => {
    const outcome = await runTransaction(spec({ verify: () => { throw new Error('nope'); } }), { now });
    assert.equal(outcome.status, 'failed');
    assert.equal((outcome as { phase: string }).phase, 'verify');
    assert.equal((outcome as { message: string }).message, 'demo failed and was undone (verify: nope)');
    assert.equal(existsSync(join(t.env.cwd, '.fsd')), false);
  });

  it('2b. a failure creating the run dir is reported in the first phase', async () => {
    const outcome = await runTransaction(spec(), { now, ops: opsFailing('mkdir') });
    assert.equal(outcome.status, 'failed');
    assert.equal((outcome as { phase: string }).phase, 'prepare');
  });

  it('2c. a failure in a later phase undoes everything, with the label in the message', async () => {
    const outcome = await runTransaction(spec({ work: async (tx, { enter }) => { tx.ensureDirs(join(t.env.cwd, 'out')); enter('apply'); throw new Error('late'); } }), { now });
    assert.equal(outcome.status, 'failed');
    assert.equal((outcome as { message: string }).message, 'demo failed and was undone (apply: late)');
    assert.equal(existsSync(join(t.env.cwd, 'out')), false);
    assert.equal(existsSync(join(t.env.cwd, '.fsd')), false);
  });

  it('3a. cancelled before the commit: undone', async () => {
    const control: RunControl = { cancelled: false };
    const outcome = await runTransaction(spec({ work: async (tx, { step }) => { tx.ensureDirs(join(t.env.cwd, 'out')); control.cancelled = true; await step(); } }), { now, control });
    assert.equal(outcome.status, 'cancelled');
    assert.equal((outcome as { message: string }).message, 'cancelled (changes undone)');
    assert.equal(existsSync(join(t.env.cwd, 'out')), false);
  });

  it('3b. cancelled after the commit: done, nothing undone', async () => {
    const control: RunControl = { cancelled: false };
    const outcome = await runTransaction(spec({ result: () => { control.cancelled = true; return 'ok'; } }), { now, control });
    assert.equal(outcome.status, 'done');
    assert.equal(existsSync(join(t.env.cwd, 'out/staged.txt')), true);
  });

  it('4. keepAncestors true keeps the cache the run created, false removes it', async () => {
    const keep = await runTransaction(spec({ keepAncestors: true }), { now });
    assert.equal(keep.status, 'done');
    assert.equal(existsSync(t.cache), true);
    assert.deepEqual(readdirSync(t.cache), []);

    const other = tempEnv();
    try {
      const outcome = await runTransaction({ ...spec({ keepAncestors: false }), env: other.env }, { now });
      assert.equal(outcome.status, 'done');
      assert.equal(existsSync(other.cache), false);
      assert.equal(existsSync(join(other.env.cwd, '.fsd')), false);
    } finally {
      other.cleanup();
    }
  });

  it('5a. a live run makes it busy before anything is touched', async () => {
    const live = writeRun(t.cache, process.ppid, 'live', journalOf('', [], { pid: process.ppid }));
    const outcome = await runTransaction(spec(), { now });
    assert.equal(outcome.status, 'busy');
    assert.equal((outcome as { phase: string }).phase, 'verify');
    assert.deepEqual(readdirSync(t.cache), [live.split('/').pop()]);
  });

  it('5b. a dead uncommitted run is undone and reported; a committed one is only discarded', async () => {
    const made = join(t.env.cwd, 'leftover');
    mkdirSync(made);
    const dead = writeRun(t.cache, 2999999, 'a', journalOf('', [{ kind: 'created', path: made }]));
    const committed = writeRun(t.cache, 2999998, 'b', journalOf('', [{ kind: 'created', path: join(t.env.cwd, 'kept') }], { committed: true }));
    mkdirSync(join(t.env.cwd, 'kept'));
    const outcome = await runTransaction(spec({ keepAncestors: true }), { now });
    assert.equal(outcome.status, 'done');
    assert.deepEqual(outcome.warnings, ['recovered an interrupted run', 'recovered an interrupted run']);
    assert.equal(existsSync(made), false);
    assert.equal(existsSync(join(t.env.cwd, 'kept')), true);
    assert.equal(existsSync(dead) || existsSync(committed), false);
  });

  it('7. moveIn undo deletes the destination; relocate undoes with a plain rename back', async () => {
    mkdirSync(join(t.env.cwd, 'task'));
    writeFileSync(join(t.env.cwd, 'task/t.md'), 't');
    const calls: string[] = [];
    const ops = { ...realOps, rename: (a: string, b: string) => { calls.push('rename'); realOps.rename(a, b); }, move: (a: string, b: string) => { calls.push('move'); realOps.move(a, b); } };
    const outcome = await runTransaction(
      spec({ work: async (tx) => { tx.relocate(join(t.env.cwd, 'task'), join(t.env.cwd, 'done')); writeFileSync(join(t.env.cwd, 's'), 's'); tx.moveIn(join(t.env.cwd, 's'), join(t.env.cwd, 'in')); throw new Error('x'); } }),
      { now, ops },
    );
    assert.equal(outcome.status, 'failed');
    assert.deepEqual(calls.slice(0, 2), ['rename', 'move']);
    assert.equal(readFileSync(join(t.env.cwd, 'task/t.md'), 'utf8'), 't');
    assert.equal(existsSync(join(t.env.cwd, 'done')), false);
    assert.equal(existsSync(join(t.env.cwd, 'in')), false);
  });

  it('7b. ensureDirs records one createdDir per missing directory, outermost first', async () => {
    let seen: string[] = [];
    await runTransaction(spec({ work: async (tx) => { tx.ensureDirs(join(t.env.cwd, 'a/b/c')); seen = tx.journal.actions.map((a) => `${a.kind}:${'path' in a ? a.path.replace(t.env.cwd, '') : ''}`); } }), { now });
    assert.deepEqual(seen.filter((s) => s.startsWith('createdDir:/a')), ['createdDir:/a', 'createdDir:/a/b', 'createdDir:/a/b/c']);
  });
});
