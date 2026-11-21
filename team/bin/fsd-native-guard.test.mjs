// F4.2: o deny da sessão nova caso a caso (T4.2.1, deny-table.tsv) e os contornos conhecidos negados pelo guard (T4.2.2,
// guard-fixtures.tsv); o deny novo não vale para o time no tmux.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { unwrap, rulesFor, decide } from './fsd-native-guard.mjs';
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
