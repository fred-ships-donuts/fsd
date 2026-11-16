import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conflictFiles, refuseConflicting } from './fsd-conflict.mjs';

test('conflictFiles: os nomes entre a árvore e a linha em branco, sem repetir', () => {
  const out = ['e2a6a99', 'team/bin/fsd-watch', 'team/setup/simulate-envs', 'team/bin/fsd-watch', '', 'Auto-merging team/bin/fsd-watch', 'CONFLICT (content): Merge conflict in team/bin/fsd-watch'].join('\n');
  assert.deepEqual(conflictFiles(out), ['team/bin/fsd-watch', 'team/setup/simulate-envs']);
});

test('conflictFiles: sem conflito (só a árvore), vazio ou indefinido → nenhum arquivo', () => {
  assert.deepEqual(conflictFiles('e2a6a99\n'), []);
  assert.deepEqual(conflictFiles('e2a6a99'), []);
  assert.deepEqual(conflictFiles(''), []);
  assert.deepEqual(conflictFiles(undefined), []);
});

test('refuseConflicting: recusa só CONFLICTING, e diz quem recusa e o PR', () => {
  const m = refuseConflicting({ number: 140, mergeable: 'CONFLICTING' }, 'fsd-review');
  assert.match(m, /#140/); assert.match(m, /fsd-review/); assert.match(m, /fsd-dev sync/);
  for (const mergeable of ['MERGEABLE', 'UNKNOWN', undefined]) assert.equal(refuseConflicting({ number: 1, mergeable }, 'fsd-qa'), '');
});
