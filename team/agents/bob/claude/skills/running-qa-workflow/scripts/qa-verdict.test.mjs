import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { verdict } from './qa-verdict.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
test('pass only when every item passes; a missing item is an error', () => {
  assert.deepEqual(verdict([{ item: 1, result: 'pass' }, { item: 2, result: 'pass' }], 2), { verdict: 'pass' });
  assert.deepEqual(verdict([{ item: 1, result: 'pass' }, { item: 2, result: 'fail' }], 2), { verdict: 'fail' });
  assert.match(verdict([{ item: 1, result: 'pass' }], 2).error, /2/);
});
test('the qa template agrees with its own verdict', () => {
  const t = JSON.parse(readFileSync(join(HERE, '..', 'templates', 'qa.json'), 'utf8'));
  assert.equal(verdict(t.acceptance, t.acceptance.length).verdict, t.verdict);
});
