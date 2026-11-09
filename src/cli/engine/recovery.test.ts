import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { readJournal } from '../core/runJournal.js';
import { recoverRuns, Stop, undo } from './recovery.js';
import { DEAD_PID, journalOf, tempEnv, writeRun, type TempEnv } from './testkit.js';

let t: TempEnv;
beforeEach(() => (t = tempEnv()));
afterEach(() => t.cleanup());

const at = (name: string) => join(t.base, name);

// Undoes the same journal twice: the second pass must change nothing and must not throw.
function undoTwice(runDir: string): void {
  const read = readJournal(runDir);
  assert.ok(read && 'journal' in read);
  undo(read.journal, runDir);
  undo(read.journal, runDir);
}

describe('undo, last action first, and twice', () => {
  it('6. created, createdDir (only when empty), displaced, moved and restore', () => {
    const runDir = writeRun(t.cache, DEAD_PID, 'u', {});
    mkdirSync(join(runDir, 'displaced'));
    // created: a folder with content
    mkdirSync(at('made/sub'), { recursive: true });
    // createdDir: one empty, one with something else inside
    mkdirSync(at('emptyDir'));
    mkdirSync(at('fullDir'));
    writeFileSync(at('fullDir/theirs.txt'), 'x');
    // displaced: the original is in the backup, something else took its place
    writeFileSync(join(runDir, 'displaced/0'), 'original');
    writeFileSync(at('disp'), 'replacement');
    // moved: back only if `to` exists and `from` does not
    writeFileSync(at('to'), 'moved');
    // restore with a backup, and with none
    writeFileSync(join(runDir, 'backup-4'), 'before');
    writeFileSync(at('r'), 'after');
    writeFileSync(at('created-file'), 'n');
    writeFileSync(join(runDir, 'journal.json'), JSON.stringify(journalOf(runDir, [
      { kind: 'created', path: at('made') },
      { kind: 'createdDir', path: at('emptyDir') },
      { kind: 'createdDir', path: at('fullDir') },
      { kind: 'displaced', path: at('disp'), backup: join(runDir, 'displaced/0') },
      { kind: 'moved', from: at('from'), to: at('to') },
      { kind: 'restore', path: at('r'), backup: join(runDir, 'backup-4') },
      { kind: 'restore', path: at('created-file'), backup: null },
    ])));
    undoTwice(runDir);
    assert.equal(existsSync(at('made')), false);
    assert.equal(existsSync(at('emptyDir')), false);
    assert.equal(existsSync(at('fullDir/theirs.txt')), true);
    assert.equal(readFileSync(at('disp'), 'utf8'), 'original');
    assert.equal(readFileSync(at('from'), 'utf8'), 'moved');
    assert.equal(existsSync(at('to')), false);
    assert.equal(readFileSync(at('r'), 'utf8'), 'before');
    assert.equal(existsSync(at('created-file')), false);
    assert.equal(existsSync(runDir), false);
  });

  it('6b. moved is left alone when `from` already exists', () => {
    const runDir = writeRun(t.cache, DEAD_PID, 'm', {});
    writeFileSync(at('to'), 'a');
    writeFileSync(at('from'), 'b');
    writeFileSync(join(runDir, 'journal.json'), JSON.stringify(journalOf(runDir, [{ kind: 'moved', from: at('from'), to: at('to') }])));
    undoTwice(runDir);
    assert.equal(readFileSync(at('from'), 'utf8'), 'b');
    assert.equal(readFileSync(at('to'), 'utf8'), 'a');
  });

  it('6c. actions are undone from the last to the first', () => {
    const runDir = writeRun(t.cache, DEAD_PID, 'o', {});
    mkdirSync(at('outer/inner'), { recursive: true });
    writeFileSync(join(runDir, 'journal.json'), JSON.stringify(journalOf(runDir, [
      { kind: 'createdDir', path: at('outer') },
      { kind: 'createdDir', path: at('outer/inner') },
    ])));
    undoTwice(runDir);
    assert.equal(existsSync(at('outer')), false);
  });
});

describe('recoverRuns and a newer journal', () => {
  it('9. schema 3 stops with failed, touches nothing, and busy still comes first', () => {
    const newer = writeRun(t.cache, DEAD_PID, 'new', { schema: 3, actions: [] });
    const otherDead = writeRun(t.cache, DEAD_PID - 1, 'old', journalOf('', [{ kind: 'created', path: at('victim') }]));
    mkdirSync(at('victim'));
    assert.throws(
      () => recoverRuns(t.cache, []),
      (error: unknown) => error instanceof Stop && error.kind === 'failed' && error.message === `${newer} was written by a newer fsd; update fsd or remove it by hand`,
    );
    assert.equal(existsSync(join(newer, 'journal.json')), true);
    assert.equal(existsSync(otherDead), true);
    assert.equal(existsSync(at('victim')), true);

    writeRun(t.cache, process.ppid, 'live', journalOf('', [], { pid: process.ppid }));
    assert.throws(() => recoverRuns(t.cache, []), (error: unknown) => error instanceof Stop && error.kind === 'busy');
  });

  it('9b. unreadable JSON stays undefined and its run dir is removed', () => {
    const runDir = writeRun(t.cache, DEAD_PID, 'bad', {});
    writeFileSync(join(runDir, 'journal.json'), '{not json');
    assert.equal(readJournal(runDir), undefined);
    const warnings: string[] = [];
    recoverRuns(t.cache, warnings);
    assert.equal(existsSync(runDir), false);
    assert.deepEqual(warnings, ['recovered an interrupted run']);
  });
});
