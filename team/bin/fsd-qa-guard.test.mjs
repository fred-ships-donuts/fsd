import { test } from 'node:test';
import assert from 'node:assert/strict';
import { qaRefusal } from './fsd-qa-guard.mjs';

const QA = '/repo/.claude/worktrees/x', MAIN = '/repo';
const env = (o) => ({ HOME: '/home/u', ...o });

test('worktree de QA com o FSD_STATE real recusa e cita FSD_STATE', () => {
  assert.match(qaRefusal({ repoDir: QA, env: env({}) }), /FSD_STATE/);
  assert.match(qaRefusal({ repoDir: QA, env: env({ FSD_STATE: '/home/u/.config/fsd-agents', FSD_TMUX_SOCKET: 's' }) }), /FSD_STATE/);
});
test('worktree de QA com estado privado mas tmux padrão recusa e cita o socket', () => {
  assert.match(qaRefusal({ repoDir: QA, env: env({ FSD_STATE: '/tmp/s' }) }), /FSD_TMUX_SOCKET/);
});
test('worktree de QA com estado e socket privados roda', () => {
  assert.equal(qaRefusal({ repoDir: QA, env: env({ FSD_STATE: '/tmp/s', FSD_TMUX_SOCKET: 's' }) }), null);
});
test('a pasta principal nunca é recusada; o workspace /tmp/fsd-qa-* é', () => {
  assert.equal(qaRefusal({ repoDir: MAIN, env: env({}) }), null);
  assert.match(qaRefusal({ repoDir: '/tmp/fsd-qa-bob/pr-1', env: env({}) }), /FSD_STATE/);
});
test('sem tmux (fsd-cleanup) só o estado conta', () => {
  assert.equal(qaRefusal({ repoDir: QA, env: env({ FSD_STATE: '/tmp/s' }), needTmux: false }), null);
});
