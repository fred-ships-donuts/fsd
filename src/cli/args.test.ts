import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeArgs } from './args.js';

const ok = (...args: string[]) => normalizeArgs(args);

describe('normalizeArgs', () => {
  it('maps the shortcuts, as separate arguments in the order -u -s -f', () => {
    for (const form of [['update', 'skill', 'x'], ['update', '-s', 'x'], ['-u', 'skill', 'x'], ['-u', '-s', 'x']]) {
      assert.deepEqual(ok(...form), { args: ['update', 'skill', 'x'] }, form.join(' '));
    }
    assert.deepEqual(ok('-u'), { args: ['update'] });
    assert.deepEqual(ok('-u', '-s'), { args: ['update', 'skill'] });
    assert.deepEqual(ok('-u', '-s', '-f', 'x'), { args: ['update', 'skill', 'x', '--force'] });
    assert.deepEqual(ok('update', 'skill', '-f'), { args: ['update', 'skill', '--force'] });
    assert.deepEqual(ok('update', '-s', '-f', 'x'), { args: ['update', 'skill', 'x', '--force'] });
  });
  it('link accepts -s and -f', () => {
    assert.deepEqual(ok('link', '-s', 'x'), { args: ['link', 'skill', 'x'] });
    assert.deepEqual(ok('link', '-s', '-f', 'x'), { args: ['link', 'skill', 'x', '--force'] });
    assert.deepEqual(ok('link', 'skill', '-f'), { args: ['link', 'skill', '--force'] });
    assert.ok('error' in ok('-u', 'link', '-s'));
    assert.ok('error' in ok('link', '-f'));
  });
  it('leaves other input alone', () => {
    assert.deepEqual(ok('init'), { args: ['init'] });
    assert.deepEqual(ok('-v'), { args: ['-v'] });
    assert.deepEqual(ok('update', 'skill', '--force'), { args: ['update', 'skill', '--force'] });
    assert.deepEqual(ok(), { args: [] });
  });
  it('rejects grouped and out-of-order shortcuts', () => {
    for (const form of [['-us'], ['-usf', 'x'], ['-sf'], ['-s', '-u'], ['-f', '-s'], ['-s', '-f', '-u'], ['-u', '-f', '-s']]) {
      assert.ok('error' in ok(...form), form.join(' '));
    }
  });
  it('rejects -s alone, -f without skill, and shortcuts mixed with other commands', () => {
    for (const form of [['-s'], ['-s', 'x'], ['-f'], ['-u', '-f'], ['update', '-f'], ['-u', 'init']]) {
      assert.ok('error' in ok(...form), form.join(' '));
    }
  });
});
