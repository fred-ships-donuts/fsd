import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { baseDirs, ensureBaseStructure, scopePaths, writeJsonAtomic, type Env } from './fsdDir.js';

export const tempEnv = (): Env => ({ home: mkdtempSync(join(tmpdir(), 'fsd-home-')), cwd: mkdtempSync(join(tmpdir(), 'fsd-cwd-')) });

describe('fsdDir', () => {
  it('resolves global and project paths', () => {
    const env = tempEnv();
    assert.equal(scopePaths('global', env).installed, join(env.home, '.fsd', 'installed.json'));
    assert.equal(scopePaths('project', env).skills, join(env.cwd, '.claude', 'skills'));
    assert.equal(scopePaths('project', env).nook, join(env.cwd, 'nook'));
  });

  it('creates the base structure, idempotently, and nothing else', () => {
    const env = tempEnv();
    ensureBaseStructure('project', env);
    ensureBaseStructure('project', env);
    for (const dir of baseDirs) assert.ok(existsSync(join(env.cwd, dir)), dir);
    assert.deepEqual(readdirSync(join(env.cwd, 'nook')).sort(), ['bakers', 'kitchen']);
    assert.deepEqual(readdirSync(env.home), []);
  });

  it('writes JSON atomically without leaving temp files', () => {
    const env = tempEnv();
    const file = join(env.home, '.fsd', 'x.json');
    writeJsonAtomic(file, { a: 1 });
    assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { a: 1 });
    assert.deepEqual(readdirSync(join(env.home, '.fsd')), ['x.json']);
  });
});
