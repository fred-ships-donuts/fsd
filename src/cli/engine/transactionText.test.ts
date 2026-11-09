import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { realOps } from './ops.js';
import { tempEnv, opsFailing, type TempEnv } from './testkit.js';
import { runTransaction, type TransactionSpec } from './transactionRun.js';

type P = 'apply';
let t: TempEnv;
beforeEach(() => (t = tempEnv()));
afterEach(() => t.cleanup());

const at = (name: string) => join(t.env.cwd, name);

function spec(work: TransactionSpec<P, string>['work'], ops = realOps): [TransactionSpec<P, string>, { ops: typeof realOps }] {
  return [{ scope: 'project', env: t.env, label: 'demo', firstPhase: 'apply', keepAncestors: false, verify: () => {}, work, result: () => 'ok' }, { ops }];
}

describe('Transaction.writeTextFiles', () => {
  it('writes the files; the run directory is gone at the end', async () => {
    writeFileSync(at('a.txt'), 'old');
    const out = await runTransaction(...spec(async (tx) => tx.writeTextFiles([{ path: at('a.txt'), content: 'new', expected: 'old' }, { path: at('b.txt'), content: 'b', expected: null }])));
    assert.equal(out.status, 'done');
    assert.equal(readFileSync(at('a.txt'), 'utf8'), 'new');
    assert.equal(readFileSync(at('b.txt'), 'utf8'), 'b');
    assert.equal(existsSync(t.cache), false);
  });

  it('undo restores the original, and removes a file that did not exist', async () => {
    writeFileSync(at('a.txt'), 'old');
    const out = await runTransaction(...spec(async (tx) => {
      tx.writeTextFiles([{ path: at('a.txt'), content: 'new' }, { path: at('b.txt'), content: 'b' }]);
      throw new Error('later failure');
    }));
    assert.equal(out.status, 'failed');
    assert.equal(readFileSync(at('a.txt'), 'utf8'), 'old');
    assert.equal(existsSync(at('b.txt')), false);
    assert.equal(existsSync(t.cache), false);
  });

  it('a failing write undoes the files already recorded', async () => {
    writeFileSync(at('a.txt'), 'old');
    const out = await runTransaction(...spec(async (tx) => tx.writeTextFiles([{ path: at('a.txt'), content: 'new' }]), opsFailing('writeText')));
    assert.equal(out.status, 'failed');
    assert.equal(readFileSync(at('a.txt'), 'utf8'), 'old');
  });

  it('a file that changed since planning is Stop(changed) with undo', async () => {
    writeFileSync(at('a.txt'), 'edited by hand');
    const out = await runTransaction(...spec(async (tx) => tx.writeTextFiles([{ path: at('a.txt'), content: 'new', expected: 'old' }])));
    assert.equal(out.status, 'changed');
    assert.equal((out as { message: string }).message, `${at('a.txt')} changed while writing, try again`);
    assert.equal(readFileSync(at('a.txt'), 'utf8'), 'edited by hand');
  });

  it('backup-<n> does not collide with the JSON files of the same run', async () => {
    writeFileSync(at('a.txt'), 'old');
    writeFileSync(at('r.json'), '{"v":1}');
    let backups: string[] = [];
    const out = await runTransaction(...spec(async (tx) => {
      tx.writeTextFiles([{ path: at('a.txt'), content: 'new' }]);
      tx.writeJsonFiles([[at('r.json'), { v: 2 }]]);
      backups = readdirSync(tx.runDir).filter((name) => name.startsWith('backup-'));
      throw new Error('undo both');
    }));
    assert.equal(out.status, 'failed');
    assert.equal(new Set(backups).size, 2);
    assert.equal(readFileSync(at('a.txt'), 'utf8'), 'old');
    assert.equal(readFileSync(at('r.json'), 'utf8'), '{"v":1}');
  });
});
