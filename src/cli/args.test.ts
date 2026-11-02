import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { normalizeArgs } from './args.js';

const ok = (...args: string[]) => normalizeArgs(args);

describe('normalizeArgs', () => {
  it('maps every shortcut combination to the long command', () => {
    for (const form of [['update', 'skill', 'x'], ['update', '-s', 'x'], ['-u', 'skill', 'x'], ['-u', '-s', 'x'], ['-us', 'x'], ['-su', 'x'], ['-s', 'x', '-u']]) {
      assert.deepEqual(ok(...form), { args: ['update', 'skill', 'x'] }, form.join(' '));
    }
    assert.deepEqual(ok('-u'), { args: ['update'] });
    assert.deepEqual(ok('-u', '-s'), { args: ['update', 'skill'] });
  });
  it('leaves other input alone', () => {
    assert.deepEqual(ok('init'), { args: ['init'] });
    assert.deepEqual(ok('-v'), { args: ['-v'] });
    assert.deepEqual(ok(), { args: [] });
  });
  it('rejects -s alone and shortcuts mixed with other commands', () => {
    assert.ok('error' in ok('-s'));
    assert.ok('error' in ok('-s', 'x'));
    assert.ok('error' in ok('-u', 'init'));
  });
});
