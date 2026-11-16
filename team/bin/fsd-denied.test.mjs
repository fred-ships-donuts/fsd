import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, statSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { record, consume } from './fsd-denied.mjs';
import { reasonOf } from './fsd-redirects.mjs';

const dir = () => mkdtempSync(join(tmpdir(), 'fsd-denied-'));

test('consume: a recorded denial is delivered once and then gone', () => {
  const d = dir();
  assert.equal(record({ dir: d, session: 's1', toolUseId: 't1', id: 'git-push' }), true);
  assert.equal(consume({ dir: d, session: 's1' }), 'git-push');
  assert.equal(consume({ dir: d, session: 's1' }), null);
});

test('consume: a denial older than the TTL is dropped (and still consumed)', () => {
  const d = dir();
  record({ dir: d, session: 's1', toolUseId: 't1', id: 'git-push', now: 1000 });
  assert.equal(consume({ dir: d, session: 's1', now: 1000 + 600001, ttl: 600000 }), null);
  assert.equal(consume({ dir: d, session: 's1', now: 1001, ttl: 600000 }), null);
});

test('record: the same tool_use_id from both hooks counts once, even after consume', () => {
  const d = dir();
  assert.equal(record({ dir: d, session: 's1', toolUseId: 't1', id: 'git-push' }), true);
  assert.equal(record({ dir: d, session: 's1', toolUseId: 't1', id: 'git-push' }), false);
  consume({ dir: d, session: 's1' });
  assert.equal(record({ dir: d, session: 's1', toolUseId: 't1', id: 'git-push' }), false);
  assert.equal(consume({ dir: d, session: 's1' }), null);
});

test('record: sessions are isolated, the file is 0600 and no temp file is left', () => {
  const d = dir();
  record({ dir: d, session: 's1', toolUseId: 't1', id: 'git-push' });
  assert.equal(consume({ dir: d, session: 's2' }), null);
  assert.equal(readdirSync(d).length, 1);
  assert.equal(statSync(join(d, readdirSync(d)[0])).mode & 0o777, 0o600);
});

test('reasonOf: text comes from the table; unknown id gives null', () => {
  assert.match(reasonOf('git-push', 'stuart'), /Do not ask the author/);
  assert.equal(reasonOf('nope'), null);
});
