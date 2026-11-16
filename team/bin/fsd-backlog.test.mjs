import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseBoardList, kevinQueue, isStanding, RESERVED } from './fsd-backlog.mjs';

test('parseBoardList: itens com título, PR marcado, coluna vazia ou sem saída', () => {
  const out = 'Backlog (Kevin) (3): #124 Slice the alerts ; #147 Alerts (standing issue, never closes) ; PR#9 um PR';
  assert.deepEqual(parseBoardList(out), [
    { number: 124, title: 'Slice the alerts', pr: false },
    { number: 147, title: 'Alerts (standing issue, never closes)', pr: false },
    { number: 9, title: 'um PR', pr: true },
  ]);
  assert.deepEqual(parseBoardList('Backlog (Kevin) (0): '), []);
  assert.deepEqual(parseBoardList(''), []);
  assert.deepEqual(parseBoardList(undefined), []);
});

test('isStanding: só pelo título "standing issue"', () => {
  assert.equal(isStanding('Alerts for the author (standing issue, never closes)'), true);
  assert.equal(isStanding('Slice the alerts'), false);
});

test('a ordem: decision, Backlog, desbloqueados, PRs prontos', () => {
  const backlog = [{ number: 124, title: 'a', pr: false }, { number: 38, title: 'b', pr: false }, { number: 147, title: 'x (standing issue)', pr: false }];
  const q = kevinQueue({ decisions: [121, 41], backlog, blocked: [38], unblocked: ['desbloqueado: #5 (#4 fechado)'], ready: [150] });
  assert.deepEqual(q, ['decision: #121 #41 (fsd-issue decide)', 'Backlog: #124 (bloqueados, não é trabalho: #38) (fixos: #147)', 'desbloqueado: #5 (#4 fechado)', 'prontos parados: #150']);
});

test('standing e bloqueado não são oferecidos como trabalho; PR na coluna não conta', () => {
  const q = kevinQueue({ backlog: [{ number: 147, title: 'x (standing issue)', pr: false }, { number: 38, title: 'b', pr: false }, { number: 7, title: 'pr', pr: true }], blocked: [38] });
  assert.deepEqual(q, ['Backlog: nada para mexer (bloqueados, não é trabalho: #38) (fixos: #147)']);
});

test('só standing no Backlog: nada na linha; mais de 3 decisions viram "+n"', () => {
  assert.deepEqual(kevinQueue({ backlog: [{ number: 147, title: '(standing issue)', pr: false }] }), []);
  assert.deepEqual(kevinQueue({ decisions: [1, 2, 3, 4, 5] }), ['decision: #1 #2 #3 +2 (fsd-issue decide)']);
});

test('#39 e #40 (reservadas pelo autor) não aparecem como decision nem como trabalho do Backlog; só como reservadas', () => {
  assert.deepEqual(RESERVED, [39, 40]);
  const backlog = [{ number: 39, title: 'a', pr: false }, { number: 40, title: 'b', pr: false }, { number: 124, title: 'c', pr: false }];
  assert.deepEqual(kevinQueue({ decisions: [39, 121, 40], backlog }), ['decision: #121 (fsd-issue decide)', 'Backlog: #124', '(reservados: #39 #40)']);
  assert.deepEqual(kevinQueue({ decisions: [40], backlog: [{ number: 39, title: 'a', pr: false }] }), ['(reservados: #39 #40)']);
});
