import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
const mk = () => { const d = mkdtempSync(join(tmpdir(), 'usage-')); return { d, fx: join(d, 'fx.json'), env: { ...process.env, FSD_STATE: d, FSD_DRY: '1', FSD_USAGE_FIXTURE: join(d, 'fx.json') } }; };
const fixture = (t, o) => writeFileSync(t.fx, JSON.stringify(o));
const ok = (five, reset = '2026-11-16T10:00:00Z') => ({ status: 200, body: { five_hour: { utilization: five, resets_at: reset }, seven_day: { utilization: 5, resets_at: '2026-11-20T00:00:00Z' } } });
const refresh = (t, now) => spawnSync(process.execPath, [join(BIN, 'fsd-usage.mjs'), 'refresh'], { env: { ...t.env, FSD_USAGE_NOW: String(now) }, encoding: 'utf8' });
const guard = (t, event, tool, input = {}) => JSON.parse(spawnSync(join(BIN, 'fsd-context-guard'), { env: { ...t.env, FSD_AGENT: '' }, input: JSON.stringify({ hook_event_name: event, tool_name: tool, tool_input: input }), encoding: 'utf8' }).stdout || '{}');

test('91% on 5h: PAUSE, PAUSE.usage and one comment on #147; guard orders wrap-up and denies new work', () => {
  const t = mk(); fixture(t, ok(91));
  const r = refresh(t, 1e12);
  assert.ok(existsSync(join(t.d, 'PAUSE')) && existsSync(join(t.d, 'PAUSE.usage')));
  assert.equal((r.stdout.match(/issue comment 147/g) || []).length, 1);
  assert.equal((refresh(t, 1e12 + 1).stdout.match(/comment/g) || []).length, 0);   // cache fresh and already paused
  assert.match(guard(t, 'PostToolUse', 'Read').hookSpecificOutput.additionalContext, /USO DA CONTA/);
  assert.equal(guard(t, 'Stop', 'x').decision, 'block');
  assert.equal(guard(t, 'PreToolUse', 'Bash', { command: 'fsd-dev start 5' }).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(guard(t, 'PreToolUse', 'Monitor').hookSpecificOutput.permissionDecision, 'deny');
  assert.deepEqual(guard(t, 'PreToolUse', 'Bash', { command: 'git push' }), {});
});

test('back under the limit with a later resets_at removes only the PAUSE it created', () => {
  const t = mk(); fixture(t, ok(91)); refresh(t, 1e12);
  fixture(t, ok(10, '2026-11-16T10:00:00Z')); refresh(t, 1e12 + 301000);   // same reset: stays
  assert.ok(existsSync(join(t.d, 'PAUSE')));
  fixture(t, ok(10, '2026-11-16T15:00:00Z')); refresh(t, 1e12 + 700000);
  assert.ok(!existsSync(join(t.d, 'PAUSE')) && !existsSync(join(t.d, 'PAUSE.usage')));
  const h = mk(); writeFileSync(join(h.d, 'PAUSE'), 'by hand'); fixture(h, ok(10)); refresh(h, 1e12);
  assert.ok(existsSync(join(h.d, 'PAUSE')));
});

test('429 stores retry-after and nobody fetches before it', () => {
  const t = mk(); fixture(t, { status: 429, retryAfter: 600 }); refresh(t, 1e12);
  assert.equal(JSON.parse(readFileSync(join(t.d, 'usage.json'), 'utf8')).retryAfterUntil, 1e12 + 600000);
  fixture(t, ok(95)); refresh(t, 1e12 + 400000);   // cache is stale (>300s) but inside retry-after
  assert.ok(!existsSync(join(t.d, 'PAUSE')));
  refresh(t, 1e12 + 601000);
  assert.ok(existsSync(join(t.d, 'PAUSE')));
});

test('manual PAUSE → limit → reset: the manual PAUSE stays, only PAUSE.usage goes', () => {
  const t = mk(); writeFileSync(join(t.d, 'PAUSE'), 'by hand');
  fixture(t, ok(91)); const r = refresh(t, 1e12);
  assert.ok(existsSync(join(t.d, 'PAUSE.usage')));
  assert.equal(JSON.parse(readFileSync(join(t.d, 'PAUSE.usage'), 'utf8')).own, false);
  assert.match(r.stdout, /already on/);
  fixture(t, ok(10, '2026-11-16T15:00:00Z')); refresh(t, 1e12 + 700000);
  assert.ok(!existsSync(join(t.d, 'PAUSE.usage')));
  assert.equal(readFileSync(join(t.d, 'PAUSE'), 'utf8'), 'by hand');
});

const stopFailure = (t, now) => spawnSync(process.execPath, [join(BIN, 'fsd-usage.mjs'), 'stop-failure'], { env: { ...t.env, FSD_USAGE_NOW: String(now) }, input: JSON.stringify({ hook_event_name: 'StopFailure', error: 'rate_limit' }), encoding: 'utf8' });

test('StopFailure rate_limit: PAUSE + PAUSE.usage (reactive), one comment; lifts after reactiveHoldMin', () => {
  const t = mk(); const r = stopFailure(t, 1e12);
  assert.equal(r.status, 0);
  assert.ok(existsSync(join(t.d, 'PAUSE')));
  const m = JSON.parse(readFileSync(join(t.d, 'PAUSE.usage'), 'utf8'));
  assert.equal(m.window, 'reactive'); assert.equal(m.own, true);
  assert.equal((r.stdout.match(/issue comment 147/g) || []).length, 1);
  assert.equal((stopFailure(t, 1e12 + 1).stdout.match(/comment/g) || []).length, 0);   // already paused
  fixture(t, { status: 401 });                                                         // #214: endpoint refuses the token
  refresh(t, 1e12 + 30 * 60000);
  assert.ok(existsSync(join(t.d, 'PAUSE')));                                           // inside the hold
  refresh(t, 1e12 + 61 * 60000);
  assert.ok(!existsSync(join(t.d, 'PAUSE')) && !existsSync(join(t.d, 'PAUSE.usage')));
});

test('StopFailure rate_limit over a manual PAUSE keeps it after the hold', () => {
  const t = mk(); writeFileSync(join(t.d, 'PAUSE'), 'by hand');
  stopFailure(t, 1e12); fixture(t, { status: 401 }); refresh(t, 1e12 + 61 * 60000);
  assert.ok(!existsSync(join(t.d, 'PAUSE.usage')));
  assert.equal(readFileSync(join(t.d, 'PAUSE'), 'utf8'), 'by hand');
});

test('claude-settings.json wires StopFailure rate_limit to fsd-usage stop-failure', () => {
  const s = JSON.parse(readFileSync(join(BIN, '..', 'claude-settings.json'), 'utf8'));
  const h = s.hooks.StopFailure.find((x) => x.matcher === 'rate_limit');
  assert.match(h.hooks[0].command, /fsd-usage\.mjs stop-failure/);
});

test('fsd-restart reads $FSD_STATE/PAUSE, not team/PAUSE', () => {
  const t = mk(); const fake = mkdtempSync(join(tmpdir(), 'bin-'));
  writeFileSync(join(fake, 'tmux'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  const run = () => spawnSync(join(BIN, 'fsd-restart'), ['--dry-run'], { cwd: t.d, encoding: 'utf8',
    env: { ...t.env, FSD_AGENT: 'stuart', TMUX_PANE: '%1', FSD_REPO: t.d, PATH: `${fake}:${process.env.PATH}` } }).stdout;
  assert.match(run(), /reiniciaria stuart/);
  writeFileSync(join(t.d, 'PAUSE'), '');
  assert.match(run(), /PAUSE ativo/);
});
