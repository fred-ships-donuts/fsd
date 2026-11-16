import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, existsSync, utimesSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { watcherDown } from './fsd-revive.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
// Stub do vigia: grava o pid e a batida, dorme. Cada partida deixa uma linha em starts.
const mk = () => {
  const d = mkdtempSync(join(tmpdir(), 'revive-')), stub = join(d, 'stub.sh');
  writeFileSync(stub, `#!/bin/sh\necho start >> "${d}/starts"\necho $$ > "${d}/watch.pid"\ntouch "${d}/watch.beat"\nsleep 30\n`); chmodSync(stub, 0o755);
  return { d, env: { ...process.env, FSD_STATE: d, FSD_AGENT: 'stuart', FSD_REVIVE_CMD: stub } };
};
const hook = (t, ev = 'UserPromptSubmit') => spawnSync(join(BIN, 'fsd-context-guard'), { env: t.env, input: JSON.stringify({ hook_event_name: ev, session_id: 'rv' }), encoding: 'utf8' });
const wait = (f) => { for (let i = 0; i < 60 && !f(); i++) spawnSync('sleep', ['0.1']); };
const starts = (t) => existsSync(join(t.d, 'starts')) ? readFileSync(join(t.d, 'starts'), 'utf8').trim().split('\n').length : 0;
const stop = (t) => { try { process.kill(Number(readFileSync(join(t.d, 'watch.pid'), 'utf8')), 'SIGKILL'); } catch {} };

test('dead watcher + stale beat: one hook call starts it, logs who, and the next call does not start another', () => {
  const t = mk();
  writeFileSync(join(t.d, 'watch.beat'), 'x'); utimesSync(join(t.d, 'watch.beat'), 1, 1);   // old beat, no pid
  hook(t); wait(() => starts(t) === 1 && existsSync(join(t.d, 'watch.pid')));
  assert.equal(starts(t), 1);
  assert.match(readFileSync(join(t.d, 'watch.log'), 'utf8'), /stuart subiu o vigia/);
  hook(t); hook(t, 'PostToolUse'); spawnSync('sleep', ['0.3']);
  assert.equal(starts(t), 1);
  stop(t);
});

test('live watcher: hook calls never spawn, even with an old beat', () => {
  const t = mk();
  writeFileSync(join(t.d, 'watch.pid'), String(process.pid)); writeFileSync(join(t.d, 'watch.beat'), 'x'); utimesSync(join(t.d, 'watch.beat'), 1, 1);
  hook(t); spawnSync('sleep', ['0.3']);
  assert.equal(starts(t), 0);
});

test('watcherDown: fresh beat with a dead pid is left alone; no beat and no pid is down', () => {
  const t = mk();
  assert.match(watcherDown(t.d, 60), /sem watch.beat/);
  writeFileSync(join(t.d, 'watch.beat'), 'x');
  assert.equal(watcherDown(t.d, 60), null);
  assert.match(watcherDown(t.d, 60, Date.now() + 200000), /parado/);
});

test('fsd-revive.mjs (what fsd-agent calls) starts a dead watcher', () => {
  const t = mk();
  spawnSync(process.execPath, [join(BIN, 'fsd-revive.mjs'), 'bob'], { env: t.env });
  wait(() => starts(t) === 1);
  assert.equal(starts(t), 1); assert.match(readFileSync(join(t.d, 'watch.log'), 'utf8'), /bob subiu o vigia/);
  stop(t);
});
