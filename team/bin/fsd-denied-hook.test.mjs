import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HOOK = join(dirname(fileURLToPath(import.meta.url)), 'fsd-denied-hook');
const run = (state, payload) => spawnSync(process.execPath, [HOOK], { input: JSON.stringify(payload), encoding: 'utf8', env: { ...process.env, FSD_STATE: state, FSD_AGENT: 'stuart' } });
const base = { session_id: 's1', tool_name: 'Bash', cwd: '/x' };
const next = (state) => { const r = run(state, { ...base, hook_event_name: 'PreToolUse', tool_use_id: 'n' }); assert.equal(r.status, 0); return r.stdout && JSON.parse(r.stdout).hookSpecificOutput.additionalContext; };
const withState = (fn) => () => { const d = mkdtempSync(join(tmpdir(), 'fsd-denied-')); try { fn(d); } finally { rmSync(d, { recursive: true, force: true }); } };

test('negação com linha na tabela: o próximo passo entrega o comando do time, uma vez', withState((d) => {
  assert.equal(run(d, { ...base, hook_event_name: 'PermissionDenied', tool_use_id: 't1', tool_input: { command: 'git push origin x' } }).status, 0);
  assert.match(next(d), /fsd-pr open/);
  assert.equal(next(d), '');
}));
test('negação sem linha na tabela: manda avisar o Kevin com fsd-notify', withState((d) => {
  run(d, { ...base, hook_event_name: 'PermissionDenied', tool_use_id: 't2', tool_input: { command: 'frobnicate --all' } });
  assert.match(next(d), /fsd-notify kevin/);
}));
test('falha comum (PostToolUseFailure) não grava e não entrega nada', withState((d) => {
  const r = run(d, { ...base, hook_event_name: 'PostToolUseFailure', tool_use_id: 't3', tool_input: { command: 'git push origin x' }, error: 'network' });
  assert.equal(r.status, 0); assert.equal(r.stdout, '');
  assert.equal(next(d), '');
}));
