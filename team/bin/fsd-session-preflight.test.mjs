// F4.1: a sessão do papel sobe com argv e settings fixos (T4.1.2), recusa sem hooks, ai-memory, login ou túnel (T4.1.3, com o stub e
// as variantes dele), o guard pede o fim do dia na sessão nova (T4.1.4) e o vigia antigo ignora papel em runner "session" (T4.1.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, chmodSync, cpSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hooksMissing, aiMemoryOf, check } from './fsd-session-preflight.mjs';
import { baseArgs } from './fsd-session.mjs';
import { wrapUpReason } from './fsd-context.mjs';

const BIN = dirname(fileURLToPath(import.meta.url)), TEAM = join(BIN, '..'), STUB = join(TEAM, 'setup', 'stub-claude');
const TEAM_SETTINGS = join(TEAM, 'claude-settings.json');

test('T4.1.2: argv per role — bypass, only the root-owned profile settings, the role name', () => {
  for (const r of ['kevin', 'mel', 'stuart', 'bob'])
    assert.deepEqual(baseArgs(r), ['--bg', '--name', r, '--permission-mode', 'bypassPermissions', '--setting-sources', 'local', '--settings', `/etc/fsd/profiles/${r}/settings.json`]);
  const sx = readFileSync(join(TEAM, 'setup', 'container', 'fsd-session-exec'), 'utf8');
  assert.match(sx, /--bg --name "\$role" --permission-mode bypassPermissions/); assert.match(sx, /--setting-sources local --settings "\/etc\/fsd\/profiles\/\$role\/settings\.json"/);
});

test('the team settings carry every hook the session needs; an empty profile misses them all', () => {
  assert.deepEqual(hooksMissing([TEAM_SETTINGS]), []);
  const empty = join(mkdtempSync(join(tmpdir(), 'pf-')), 's.json'); writeFileSync(empty, '{}');
  assert.ok(hooksMissing([empty]).length >= 5); assert.ok(hooksMissing([empty]).includes('ai-memory: nenhum hook'));
  assert.equal(aiMemoryOf([TEAM_SETTINGS], '/h').bin, '/h/.local/lib/ai-memory/ai-memory'); assert.equal(aiMemoryOf([TEAM_SETTINGS], '/h').port, 49374);
});

async function world({ binary = true } = {}) {
  const home = mkdtempSync(join(tmpdir(), 'pfh-'));
  if (binary) { mkdirSync(join(home, '.local', 'lib', 'ai-memory'), { recursive: true }); writeFileSync(join(home, '.local', 'lib', 'ai-memory', 'ai-memory'), '#!/bin/sh\n'); chmodSync(join(home, '.local', 'lib', 'ai-memory', 'ai-memory'), 0o755); }
  return home;
}
test('T4.1.3: all present → no reason; each stub variant is refused with its reason', async () => {
  const home = await world(); const open = async () => true, closed = async () => false;
  const env = (o) => { Object.assign(process.env, o); };
  const keep = process.env.STUB_NOT_LOGGED_IN; delete process.env.STUB_NOT_LOGGED_IN;
  process.env.STUB_CLAUDE_DIR = mkdtempSync(join(tmpdir(), 'pfs-'));
  try {
    assert.deepEqual(await check({ settingsFiles: [TEAM_SETTINGS], claude: STUB, home, probe: open }), []);
    assert.deepEqual(await check({ settingsFiles: [TEAM_SETTINGS], claude: STUB, home, probe: closed }), ['túnel do ai-memory fechado (127.0.0.1:49374)']);
    assert.match((await check({ settingsFiles: [TEAM_SETTINGS], claude: STUB, home: await world({ binary: false }), probe: open })).join(), /ai-memory não instalado/);
    env({ STUB_NOT_LOGGED_IN: '1' });
    assert.deepEqual(await check({ settingsFiles: [TEAM_SETTINGS], claude: STUB, home, probe: open }), ['claude sem login (claude auth status: loggedIn false)']);
    delete process.env.STUB_NOT_LOGGED_IN;
    const empty = join(home, 'empty.json'); writeFileSync(empty, '{}');
    assert.match((await check({ settingsFiles: [empty], claude: STUB, home, probe: open })).join(), /hook faltando \(PostToolUse: fsd-session-hook\)/);
  } finally { if (keep === undefined) delete process.env.STUB_NOT_LOGGED_IN; else process.env.STUB_NOT_LOGGED_IN = keep; }
});

test('T4.1.3 with a real port: the probe sees a listening tunnel', async () => {
  const s = createServer(() => {}); await new Promise((r) => s.listen(0, '127.0.0.1', r));
  const { portOpen } = await import('./fsd-session-preflight.mjs');
  try { assert.equal(await portOpen(s.address().port), true); } finally { s.close(); }
  assert.equal(await portOpen(1), false);
});

test('the stub "Not logged in" variant: --bg fails with the message', () => {
  const r = spawnSync(STUB, ['--bg', '--name', 'mel', 'x'], { encoding: 'utf8', env: { ...process.env, STUB_NOT_LOGGED_IN: '1', STUB_CLAUDE_DIR: mkdtempSync(join(tmpdir(), 'pfs-')) } });
  assert.equal(r.status, 1); assert.match(r.stderr, /Not logged in/);
});

test('D6: fsd-session refuses to start a bypass session outside the isolated setup', () => {
  const r = spawnSync(join(BIN, 'fsd-session'), ['start', 'mel', 'x'], { encoding: 'utf8', env: { ...process.env, FSD_SESSION_ALLOW_UNISOLATED: '', FSD_SESSION_VIA: '', FSD_STATE: mkdtempSync(join(tmpdir(), 'pf-')), FSD_CLAUDE: STUB } });
  assert.equal(r.status, 1); assert.match(r.stdout, /sem isolamento.*D6/);
});

test('T4.1.4: in a session runner the context guard asks to close the day instead of fsd-restart', () => {
  assert.match(wrapUpReason(250000, 200000, { session: true }), /Feche o dia agora: passagem de bastão no ai-memory \(memory_handoff_begin\), commit e push/);
  assert.doesNotMatch(wrapUpReason(250000, 200000, { session: true }), /fsd-restart/);
  assert.match(wrapUpReason(250000, 200000, { session: false }), /fsd-restart AGORA/);
});

test('T4.1.5: the old watcher does not bring back a role migrated to runner "session"', () => {
  const t = mkdtempSync(join(tmpdir(), 'team-')); for (const p of ['bin', 'agents.json', 'redirects.json', 'claude-settings.json']) cpSync(join(TEAM, p), join(t, p), { recursive: true });
  const cfg = JSON.parse(readFileSync(join(t, 'agents.json'), 'utf8')); cfg.agents.mel.runner = 'session'; writeFileSync(join(t, 'agents.json'), JSON.stringify(cfg));
  const r = spawnSync(join(t, 'bin', 'fsd-watch'), [], { encoding: 'utf8', env: { ...process.env, FSD_STATE: mkdtempSync(join(tmpdir(), 'ws-')), FSD_DRY: '1', FSD_TMUX_SOCKET: `pf-${process.pid}`, FSD_REPO: t } });
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /Kevin/); assert.match(r.stdout, /Stuart/); assert.doesNotMatch(r.stdout, /│ Mel /);
  assert.match(readFileSync(join(BIN, 'fsd-wait'), 'utf8'), /runner !== 'session'/);
});
