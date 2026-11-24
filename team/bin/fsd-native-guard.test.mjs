// F4.2: o deny da sessão nova caso a caso (T4.2.1, deny-table.tsv) e os contornos conhecidos negados pelo guard (T4.2.2,
// guard-fixtures.tsv); o deny novo não vale para o time no tmux.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unwrap, rulesFor, decide, qaAlone } from './fsd-native-guard.mjs';
import { deniedBy } from './fsd-audit.mjs';

const BIN = dirname(fileURLToPath(import.meta.url)), TEAM = join(BIN, '..');
const rows = (f) => readFileSync(join(TEAM, 'docs', f), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).map((l) => l.split('\t'));
const sessionDeny = (role) => JSON.parse(readFileSync(join(TEAM, 'agents', role, 'claude', 'settings.session.json'), 'utf8')).permissions.deny;

for (const [role, cmd, expect, why] of rows('deny-table.tsv')) {
  test(`T4.2.1 ${role}: ${cmd} → ${expect} (${why})`, () => {
    if (cmd.startsWith('tool:')) { assert.equal(sessionDeny(role).includes(cmd.slice(5)), expect === 'deny'); return; }
    const hit = deniedBy(cmd, rulesFor(role));
    assert.equal(!!hit, expect === 'deny', `${cmd}: ${hit}`);
  });
}
for (const [role, cmd, expect] of rows('guard-fixtures.tsv')) {
  test(`T4.2.2 guard ${role}: ${cmd} → ${expect}`, () => assert.equal(!!decide({ tool_name: 'Bash', tool_input: { command: cmd } }, rulesFor(role)), expect === 'deny', unwrap(cmd).join(' | ')));
}

test('the guard blocks Monitor, ListAgents and SendMessage, and fails closed', () => {
  for (const t of ['Monitor', 'ListAgents', 'SendMessage']) assert.match(decide({ tool_name: t }, []), /fsd-diga/);
  const run = (input, env) => spawnSync(join(BIN, 'fsd-native-guard'), { input, encoding: 'utf8', env: { ...process.env, FSD_AGENT: 'stuart', ...env } });
  assert.equal(JSON.parse(run('{"tool_name":"Bash","tool_input":{"command":"sh -c \'fsd-merge 1\'"}}', { FSD_RUNNER: 'session' }).stdout).hookSpecificOutput.permissionDecision, 'deny');
  assert.equal(run('{"tool_name":"Bash","tool_input":{"command":"npm test"}}', { FSD_RUNNER: 'session' }).stdout, '');
  assert.match(run('not json', { FSD_RUNNER: 'session' }).stdout, /na dúvida, negado/);
  assert.equal(run('{"tool_name":"Bash","tool_input":{"command":"sh -c \'fsd-merge 1\'"}}', { FSD_RUNNER: '' }).stdout, '');   // time no tmux: nada
});

test('the new deny lives only in settings.session.json: the tmux Kevin still merges', () => {
  const legacy = ['claude-settings.json', 'agents/kevin/claude/settings.json'].flatMap((f) => (JSON.parse(readFileSync(join(TEAM, f), 'utf8')).permissions?.deny || []).map((r) => /^Bash\((.*)\)$/.exec(r)?.[1]).filter(Boolean));
  assert.equal(deniedBy('fsd-merge 7', legacy), null);
  for (const r of ['kevin', 'mel', 'stuart', 'bob']) assert.ok(JSON.parse(readFileSync(join(TEAM, 'agents', r, 'claude', 'settings.session.json'), 'utf8')).hooks.PreToolUse[0].hooks[0].command.endsWith('fsd-native-guard'));
});

test('F2.5: every session profile turns the Bash sandbox on, with no way out and the credential denied; only Bob\'s fsd-qa is excluded', () => {
  for (const r of ['kevin', 'mel', 'stuart', 'bob']) {
    const sb = JSON.parse(readFileSync(join(TEAM, 'agents', r, 'claude', 'settings.session.json'), 'utf8')).sandbox;
    assert.equal(sb.enabled, true); assert.equal(sb.allowUnsandboxedCommands, false); assert.equal(sb.failIfUnavailable, true);
    assert.ok(sb.filesystem.denyRead.includes('~/.claude/.credentials.json')); assert.ok(sb.filesystem.denyRead.includes('~/.local/share/ai-memory/auth-token'));
    // As regras Read(...) do deny valem também no sandbox: sem isto o gh do papel não lê o próprio token (a ferramenta Read segue negada).
    assert.deepEqual(sb.filesystem.allowRead, [`/var/lib/fsd-tokens/${r}`]);
    assert.ok(JSON.parse(readFileSync(join(TEAM, 'agents', r, 'claude', 'settings.session.json'), 'utf8')).permissions.deny.includes('Read(//var/lib/fsd-tokens/**)'));
    assert.deepEqual(sb.network.allowedDomains, ['*']); assert.deepEqual(sb.excludedCommands || [], r === 'bob' ? ['fsd-qa *'] : []);
  }
  const legacy = JSON.parse(readFileSync(join(TEAM, 'claude-settings.json'), 'utf8')); assert.equal(legacy.sandbox, undefined);   // o time no tmux não muda
});

test('R21: Bob\'s fsd-qa passes only alone on the line; the multi-command item goes by --file, never by heredoc', () => {
  for (const ok of ['fsd-qa run 2 --file /tmp/item2.sh', 'fsd-qa run 1 "fsd --version"', 'fsd-qa verdict 1 PASS "ok"', 'ls -la']) assert.equal(qaAlone(ok), true, ok);
  for (const bad of ["fsd-qa run 2 - <<'X'\necho a\nX", "fsd-qa run 2 - <<'X'\nX\nid > /tmp/pwned\nX", 'fsd-qa run 2 --file /tmp/f; id', 'fsd-qa run 1 x | sh', 'fsd-qa run 1 $(id)'])
    assert.equal(qaAlone(bad), false, bad);
  assert.match(decide({ tool_name: 'Bash', tool_input: { command: "fsd-qa run 2 - <<'X'\na\nX" } }, []), /fsd-qa run <k> --file <arquivo>/);
});
