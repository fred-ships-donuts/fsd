// F4.1: a sessão do papel sobe com argv e settings fixos (T4.1.2), recusa sem hooks, ai-memory, login ou túnel (T4.1.3, com o stub e
// as variantes dele), o guard pede o fim do dia na sessão nova (T4.1.4) e o vigia antigo ignora papel em runner "session" (T4.1.5).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, chmodSync, cpSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hooksMissing, aiMemoryOf, check, hookScriptsMissing } from './fsd-session-preflight.mjs';
import { baseArgs } from './fsd-session.mjs';
import { wrapUpReason } from './fsd-context.mjs';

const BIN = dirname(fileURLToPath(import.meta.url)), TEAM = join(BIN, '..'), STUB = join(TEAM, 'setup', 'stub-claude');
const TEAM_SETTINGS = join(TEAM, 'claude-settings.json');

test('T4.1.2: argv per role — bypass, only the root-owned profile settings, the role name', () => {
  for (const r of ['kevin', 'mel', 'stuart', 'bob'])
    assert.deepEqual(baseArgs(r), ['--bg', '--name', r, '--permission-mode', 'bypassPermissions', '--setting-sources', 'local', '--settings', `/etc/fsd/profiles/${r}/settings.json`, '--append-system-prompt-file', `/etc/fsd/profiles/${r}/system.md`]);
  const sx = readFileSync(join(TEAM, 'setup', 'container', 'fsd-session-exec'), 'utf8');
  // R40: o MCP do papel (do root, com o --config do ai-memory) quando existe, senão o do time. R39: o prompt entra pelo stdin.
  assert.match(sx, /--mcp-config "\$MCP" --strict-mcp-config "\$\{PLUGIN\[@\]\}" "\$@" < "\$pf"/); assert.match(sx, /PLUGIN=\(--plugin-dir "\/etc\/fsd\/profiles\/\$role\/plugin"\)/); assert.match(sx, /MCP="\$TEAM\/mcp\.json"; \[ -f "\/etc\/fsd\/profiles\/\$role\/mcp\.json" \]/);
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
    // T2.5.2: o perfil da sessão chama o hook sem --auth-token; aí o token tem de estar no arquivo do data dir.
    const prof = join(home, 'profile.json'); const t = JSON.parse(readFileSync(TEAM_SETTINGS, 'utf8'));
    for (const l of Object.values(t.hooks)) for (const x of l) for (const h of x.hooks) h.command = h.command.replace(' --auth-token "$AI_MEMORY_AUTH_TOKEN"', '');
    writeFileSync(prof, JSON.stringify(t));
    assert.equal(aiMemoryOf([TEAM_SETTINGS], home).tokenFile, null);
    assert.deepEqual(await check({ settingsFiles: [prof], claude: STUB, home, probe: open }), [`sem o token do ai-memory (${home}/.local/share/ai-memory/auth-token)`]);
    mkdirSync(join(home, '.local', 'share', 'ai-memory'), { recursive: true }); writeFileSync(join(home, '.local', 'share', 'ai-memory', 'auth-token'), 'aim_x\n');
    assert.deepEqual(await check({ settingsFiles: [prof], claude: STUB, home, probe: open }), []);
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
  const cfg = JSON.parse(readFileSync(join(t, 'agents.json'), 'utf8')); for (const a of Object.values(cfg.agents)) delete a.runner; cfg.agents.mel.runner = 'session'; writeFileSync(join(t, 'agents.json'), JSON.stringify(cfg));
  const r = spawnSync(join(t, 'bin', 'fsd-watch'), [], { encoding: 'utf8', env: { ...process.env, FSD_STATE: mkdtempSync(join(tmpdir(), 'ws-')), FSD_DRY: '1', FSD_TMUX_SOCKET: `pf-${process.pid}`, FSD_REPO: t } });
  assert.equal(r.status, 0, r.stderr); assert.match(r.stdout, /Kevin/); assert.match(r.stdout, /Stuart/); assert.doesNotMatch(r.stdout, /│ Mel /);
  assert.match(readFileSync(join(BIN, 'fsd-wait'), 'utf8'), /runner !== 'session'/);
});

test('T0.2.3: a hook whose script is missing fails open in claude, so the preflight refuses it', async () => {
  const TEAMDIR = join(dirname(TEAM_SETTINGS));
  assert.deepEqual(hookScriptsMissing([TEAM_SETTINGS], { home: '/nada', team: TEAMDIR }).filter((p) => !p.endsWith('ai-memory/ai-memory')), []);
  const d = mkdtempSync(join(tmpdir(), 'pfm-')); const f = join(d, 's.json');
  writeFileSync(f, JSON.stringify({ hooks: { PreToolUse: [{ hooks: [{ command: '$FSD_TEAM/bin/fsd-native-guard' }, { command: 'node x.mjs' }] }] } }));
  assert.deepEqual(hookScriptsMissing([f], { home: d, team: d }), [`${d}/bin/fsd-native-guard`]);
  assert.match((await check({ settingsFiles: [f], claude: STUB, home: d, team: d, probe: async () => true })).join(), /script do hook ausente \(.*fsd-native-guard\)/);
});

test('E6: run through a symlinked team dir (/srv/fsd/team → team-<sha>), the preflight still runs and refuses', () => {
  const d = mkdtempSync(join(tmpdir(), 'pfl-')); const link = join(d, 'team'); symlinkSync(join(dirname(TEAM_SETTINGS)), link);
  const f = join(d, 'empty.json'); writeFileSync(f, '{}');
  const r = spawnSync(process.execPath, [join(link, 'bin', 'fsd-session-preflight.mjs'), f], { encoding: 'utf8', env: { ...process.env, FSD_PREFLIGHT_CLAUDE: STUB } });
  assert.equal(r.status, 1, r.stdout + r.stderr); assert.match(r.stdout, /a sessão não sobe/);
});
