import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { recoverRuns } from '../engine/recovery.js';
import { existsSync, readFileSync } from 'node:fs';
import { deadRunPaths, readJournal } from './runJournal.js';
import { scopePaths } from './scope.js';
import { writeRun } from '../engine/testkit.js';

let base: string;
beforeEach(() => (base = mkdtempSync(join(tmpdir(), 'fsd-test-'))));
afterEach(() => rmSync(base, { recursive: true, force: true }));

const v1 = (runDir: string, over: Record<string, unknown> = {}) => ({
  id: 'x', pid: 2999999, startedAt: 't', scope: 'project', runAncestors: [], cacheCreated: false, committed: false,
  created: [join(base, 'made')], displaced: [{ path: join(base, 'disp'), backup: join(runDir, 'displaced/0') }], restore: [{ path: join(base, 'r'), backup: join(runDir, 'backup-r') }, { path: join(base, 'fresh'), backup: null }],
  ...over,
});

describe('journal v1 to v2', () => {
  it('8a. a hand-written v1 journal converts to restore, displaced, created and is recovered like the old undo', () => {
    const home = join(base, 'home');
    const cwd = join(base, 'proj');
    mkdirSync(home);
    mkdirSync(cwd);
    const cache = scopePaths('project', { home, cwd }).cache;
    const runDir = join(cache, 'run-2999999-x');
    mkdirSync(join(runDir, 'displaced'), { recursive: true });
    mkdirSync(join(base, 'made'));
    writeFileSync(join(runDir, 'displaced/0'), 'orig');
    writeFileSync(join(base, 'disp'), 'new');
    writeFileSync(join(runDir, 'backup-r'), 'before');
    writeFileSync(join(base, 'r'), 'after');
    writeFileSync(join(base, 'fresh'), 'f');
    writeFileSync(join(runDir, 'journal.json'), JSON.stringify(v1(runDir)));

    const read = readJournal(runDir);
    assert.ok(read && 'journal' in read);
    const journal = read.journal;
    assert.equal(journal.schema, 2);
    assert.deepEqual(journal.actions.map((a) => a.kind), ['restore', 'restore', 'displaced', 'created']);

    recoverRuns(cache, []);
    assert.equal(existsSync(join(base, 'made')), false);
    assert.equal(readFileSync(join(base, 'disp'), 'utf8'), 'orig');
    assert.equal(readFileSync(join(base, 'r'), 'utf8'), 'before');
    assert.equal(existsSync(join(base, 'fresh')), false);
    assert.equal(existsSync(runDir), false);
  });

  it('8b. deadRunPaths reads created and createdDir of v1 and v2, ignoring committed, live and newer ones', () => {
    const home = join(base, 'home');
    const cwd = join(base, 'proj');
    mkdirSync(home);
    mkdirSync(cwd);
    const env = { home, cwd };
    const cache = scopePaths('project', env).cache;
    writeRun(cache, 2999999, 'v1', v1('', { created: ['/a'] }));
    writeRun(cache, 2999998, 'v2', { schema: 2, committed: false, actions: [{ kind: 'created', path: '/b' }, { kind: 'createdDir', path: '/c' }, { kind: 'moved', from: '/d', to: '/e' }, { kind: 'displaced', path: '/f', backup: '/g' }] });
    writeRun(cache, 2999997, 'done', { schema: 2, committed: true, actions: [{ kind: 'created', path: '/h' }] });
    writeRun(cache, 2999996, 'new', { schema: 3, actions: [{ kind: 'created', path: '/i' }] });
    writeRun(cache, process.ppid, 'live', { schema: 2, committed: false, actions: [{ kind: 'created', path: '/j' }] });
    assert.deepEqual(deadRunPaths('project', env).sort(), ['/a', '/b', '/c']);
  });
});
