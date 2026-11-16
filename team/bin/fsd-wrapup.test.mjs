import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wrapUpAllowed, wrapUpReason, contextAction } from './fsd-context.mjs';

const bash = (command) => wrapUpAllowed('Bash', { command });

test('wrap-up set: git add/commit/push/status/diff, fsd-pr open, fsd-restart pass', () => {
  for (const c of ['git add -A', 'git commit -m "a; b"', 'git push', 'git status', 'git -C /x diff', 'fsd-restart', 'cd /repo && fsd-restart', 'fsd-pr open "t" -C /w --verified -', 'fsd-notify kevin "x"', 'fsd-qa finish', 'fsd-review post 3 approve -'])
    assert.equal(bash(c), true, c);
});

test('wrap-up set: heredoc body is not a command', () => {
  assert.equal(bash("fsd-pr open \"t\" -C /w --verified - <<'X'\nnpm test && rm -rf x\nX"), true);
});

test('wrap-up set: anything else is denied, including chains with an outside command', () => {
  for (const c of ['npm test', 'git commit -m x && npm test', 'git status | grep x; cat f', 'echo $(git status)', 'git reset --hard', 'sed -n 1,5p f', ''])
    assert.equal(bash(c), false, c);
  for (const t of ['Read', 'Edit', 'Write', 'Monitor']) assert.equal(wrapUpAllowed(t, {}), false, t);
});

test('wrap-up set: the ai-memory handoff passes, other memory tools do not', () => {
  assert.equal(wrapUpAllowed('mcp__ai-memory__memory_handoff_begin', {}), true);
  assert.equal(wrapUpAllowed('mcp__ai-memory__memory_query', {}), false);
});

test('wrapUpReason names the context and the limit', () => {
  assert.match(wrapUpReason(101000, 100000), /Contexto 101k > 100k.*fsd-restart AGORA/);
});

const base = { above: 100000, hardMargin: 10000, tools: [], pane: '', paneCommand: 'node' };
test('contextAction: working at the limit or below the hard cap → nothing; above the cap → restart', () => {
  assert.equal(contextAction({ ...base, ctx: 100000, working: true }), null);
  assert.equal(contextAction({ ...base, ctx: 110000, working: true }), null);
  assert.equal(contextAction({ ...base, ctx: 110001, working: true }), 'restart');
});

test('contextAction: not at a safe point (tool alive, dialog, shell) → wait', () => {
  assert.equal(contextAction({ ...base, ctx: 120000, working: true, tools: [{ tool: 'Bash' }] }), null);
  assert.equal(contextAction({ ...base, ctx: 120000, working: true, pane: 'Do you want to proceed?' }), null);
  assert.equal(contextAction({ ...base, ctx: 120000, working: true, paneCommand: 'bash' }), null);
});

test('contextAction: Monitor above restartAbove → restart at once; not above → nothing; idle without Monitor → nothing', () => {
  assert.equal(contextAction({ ...base, ctx: 100001, working: false, monitor: true }), 'restart');
  assert.equal(contextAction({ ...base, ctx: 100000, working: false, monitor: true }), null);
  assert.equal(contextAction({ ...base, ctx: 150000, working: false, monitor: false }), null);
});

// ── O guard de ponta a ponta: transcript de fixture, FSD_STATE temporário ──
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { context } from './fsd-context.mjs';

const GUARD = join(dirname(fileURLToPath(import.meta.url)), 'fsd-context-guard');
function guard(used, tool, tool_input = {}, state = mkdtempSync(join(tmpdir(), 'fsd-g-'))) {
  const tr = join(state, 'tr.jsonl');
  writeFileSync(tr, JSON.stringify({ type: 'assistant', message: { model: 'x', usage: { input_tokens: used, output_tokens: 1 }, content: [] } }) + '\n');
  const r = spawnSync('node', [GUARD], { encoding: 'utf8', env: { ...process.env, FSD_AGENT: 'stuart', FSD_STATE: state }, input: JSON.stringify({ hook_event_name: 'PreToolUse', tool_name: tool, tool_input, transcript_path: tr, session_id: 't' }) });
  return r.stdout ? JSON.parse(r.stdout).hookSpecificOutput : {};
}
process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'fsd-g-'));   // sem o agents.local.json desta instalação
const ABOVE = context('stuart').restartAbove;

test('guard above restartAbove: Read, Edit and npm test denied with the reason; commit, push, fsd-pr open, fsd-restart allowed', () => {
  for (const [t, i] of [['Read', {}], ['Edit', {}], ['Bash', { command: 'npm test' }]]) {
    const o = guard(ABOVE + 1, t, i); assert.equal(o.permissionDecision, 'deny', t); assert.match(o.permissionDecisionReason, /fsd-restart AGORA/);
  }
  for (const c of ['git commit -m x', 'git push', 'fsd-pr open "t" -C /w', 'fsd-restart']) assert.equal(guard(ABOVE + 1, 'Bash', { command: c }).permissionDecision, undefined, c);
  assert.equal(guard(ABOVE + 1, 'Read').permissionDecision, 'deny');
});

test('guard at or below restartAbove: every tool is allowed', () => {
  for (const [t, i] of [['Read', {}], ['Edit', {}], ['Bash', { command: 'npm test' }]]) assert.equal(guard(ABOVE - 1, t, i).permissionDecision, undefined, t);
});

test('guard honors agents.local.json overriding restartAbove', () => {
  const state = mkdtempSync(join(tmpdir(), 'fsd-g-'));
  writeFileSync(join(state, 'agents.local.json'), JSON.stringify({ claude_common: { context: { restartAbove: 1000 } } }));
  assert.equal(guard(1500, 'Read', {}, state).permissionDecision, 'deny');
  assert.equal(guard(900, 'Read', {}, state).permissionDecision, undefined);
});
