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

// budgetOk do nativo: a statusline do papel grava o uso na pasta dele; o supervisor lê o mais recente entre os papéis.
test('native budget: the role statusline writes rate_limits to its state, and teamCache takes the freshest live one', () => {
  const root = mkdtempSync(join(tmpdir(), 'usage-root-'));
  for (const r of ['kevin', 'mel', 'stuart', 'bob']) spawnSync('mkdir', ['-p', join(root, r)]);
  const sl = (role, json, now) => spawnSync(process.execPath, [join(BIN, 'fsd-usage.mjs'), 'statusline'], { env: { ...process.env, FSD_STATE: join(root, role), FSD_STATE_ROOT: root, FSD_AGENT: role, FSD_RUNNER: 'session', FSD_USAGE_NOW: String(now) }, input: json, encoding: 'utf8' });
  const resets = 2e9;   // segundos, como a statusline manda
  const a = sl('mel', JSON.stringify({ rate_limits: { five_hour: { used_percentage: 40, resets_at: resets }, seven_day: { used_percentage: 20, resets_at: resets } } }), 1e12);
  assert.equal(a.status, 0); assert.match(a.stdout, /fsd mel · 5h 40% · semana 20%/);
  sl('bob', JSON.stringify({ rate_limits: { five_hour: { used_percentage: 93, resets_at: resets } } }), 1e12 + 1000);
  // JSON sem rate_limits (ou quebrado): imprime a linha e não apaga o cache do papel
  assert.equal(sl('bob', 'not json', 1e12 + 2000).status, 0);
  assert.equal(JSON.parse(readFileSync(join(root, 'bob', 'usage.json'), 'utf8')).five_hour.utilization, 93);
  const code = `import { teamCache, over } from '${join(BIN, 'fsd-usage.mjs')}'; const c = teamCache(undefined, Number(process.env.T)); console.log(JSON.stringify({ c, o: over(c, 90) }));`;
  const run = (t) => JSON.parse(spawnSync(process.execPath, ['--input-type=module', '-e', code], { env: { ...process.env, FSD_STATE: join(root, 'sup'), FSD_STATE_ROOT: root, T: String(t) }, encoding: 'utf8' }).stdout);
  const r1 = run(1e12 + 5000); assert.equal(r1.c.five_hour.utilization, 93); assert.deepEqual(r1.o, { pct: 93, window: 'five_hour' });
  // depois do reset da janela, o uso velho não segura o time
  const r2 = run(resets * 1000 + 1); assert.equal(r2.c, null); assert.equal(r2.o, null);
});

test('native budget: in a session runner the guard never kicks the endpoint refresh (no team token there)', () => {
  const t = mk(); fixture(t, ok(10));
  spawnSync(join(BIN, 'fsd-context-guard'), { env: { ...t.env, FSD_DRY: '', FSD_RUNNER: 'session', FSD_AGENT: 'bob' }, input: JSON.stringify({ hook_event_name: 'UserPromptSubmit' }), encoding: 'utf8' });
  spawnSync('sleep', ['0.5']); assert.equal(existsSync(join(t.d, 'usage.json')), false);
});

test('statusline: the accumulated cost of the session goes to cost.json; without cost or session nothing is written', () => {
  const d = mkdtempSync(join(tmpdir(), 'uc-')); const sl = (j) => spawnSync(process.execPath, [join(BIN, 'fsd-usage.mjs'), 'statusline'], { input: typeof j === 'string' ? j : JSON.stringify(j), encoding: 'utf8', env: { ...process.env, FSD_STATE: d, FSD_STATE_ROOT: '', FSD_AGENT: 'mel', FSD_RUNNER: 'session' } });
  for (const j of ['lixo', {}, { session_id: 's' }, { cost: { total_cost_usd: 1 } }]) assert.equal(sl(j).status, 0);
  assert.equal(existsSync(join(d, 'cost.json')), false);
  sl({ session_id: 's', model: { id: 'claude-sonnet-5-5' }, cost: { total_cost_usd: 0.25, total_api_duration_ms: 900 } });
  const c = JSON.parse(readFileSync(join(d, 'cost.json'), 'utf8')); assert.deepEqual([c.session, c.model, c.usd, c.ms], ['s', 'claude-sonnet-5-5', 0.25, 900]);
});
