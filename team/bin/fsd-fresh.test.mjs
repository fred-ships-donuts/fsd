import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeFresh } from './fsd-fresh.mjs';

const fmt = (n) => `novo: ${n.join(' ')}`;

test('card novo no Backlog (Kevin) acorda; a primeira leitura e "nada mudou" não', () => {
  const fresh = makeFresh();
  assert.equal(fresh('col:backlog', ['#124', '#125'], fmt), '', 'a primeira leitura só guarda a linha de base');
  assert.equal(fresh('col:backlog', ['#124', '#125'], fmt), '', 'nada mudou');
  assert.equal(fresh('col:backlog', ['#124', '#125', '#161'], fmt), 'novo: #161', 'card novo');
  assert.equal(fresh('col:backlog', ['#124', '#125', '#161'], fmt), 'novo: #161', 'o que já foi dito continua novo: quem chama sai ao disparar; a linha de base é do processo');
});

test('label decision nova acorda; a que já estava na linha de base não', () => {
  const fresh = makeFresh();
  assert.equal(fresh('decision', ['#121'], fmt), '');
  assert.equal(fresh('decision', ['#121'], fmt), '', 'nada mudou');
  assert.equal(fresh('decision', ['#121', '#173'], fmt), 'novo: #173');
});

test('as chaves não se misturam: o Backlog e a decision têm linha de base própria', () => {
  const fresh = makeFresh();
  fresh('col:backlog', ['#1'], fmt); fresh('decision', ['#2'], fmt);
  assert.equal(fresh('decision', ['#2', '#3'], fmt), 'novo: #3');
  assert.equal(fresh('col:backlog', ['#1'], fmt), '');
});

test('--now: o que já existe na primeira leitura também dispara; vazio não', () => {
  const fresh = makeFresh({ now: true });
  assert.equal(fresh('col:backlog', ['#124'], fmt), 'novo: #124');
  assert.equal(fresh('decision', [], fmt), '');
});
