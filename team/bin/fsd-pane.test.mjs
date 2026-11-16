import { test } from 'node:test';
import assert from 'node:assert/strict';
import { paneState } from './fsd-pane.mjs';

const idle = ['● Pronto.', '╭────────╮', '│ >  │', '╰────────╯'];

test('painel num shell: shell, mesmo com diálogo ou texto na tela', () => {
  for (const cmd of ['bash', 'zsh', 'sh', 'bash\n']) assert.equal(paneState({ cmd, tail: idle }), 'shell');
  assert.equal(paneState({ cmd: 'bash', tail: ['Do you want to proceed?'] }), 'shell');
});

test('Claude (node/claude) com entrada vazia: clear', () => {
  assert.equal(paneState({ cmd: 'claude', tail: idle }), 'clear');
  assert.equal(paneState({ cmd: 'node', tail: [] }), 'clear');
  assert.equal(paneState({ tail: idle }), 'clear');
});

test('diálogo na tela: dialog', () => {
  for (const l of ['Do you want to proceed?', '❯ 1. Yes', 'Press Enter to continue', 'Do you trust the files in this folder?', 'Quick safety check: trust this folder']) {
    assert.equal(paneState({ cmd: 'claude', tail: ['texto', l, '  2. No'] }), 'dialog', l);
  }
});

test('a palavra "trust" na prosa do agente não é diálogo', () => {
  assert.equal(paneState({ cmd: 'claude', tail: ["● I don't trust this regex, so I tested it.", ...idle] }), 'clear');
});

test('texto na linha de entrada: input (com ou sem borda)', () => {
  assert.equal(paneState({ cmd: 'claude', tail: ['● ok', '│ > meio digitado │'] }), 'input');
  assert.equal(paneState({ cmd: 'claude', tail: ['> meio digitado'] }), 'input');
  assert.equal(paneState({ cmd: 'claude', tail: ['❯ meio digitado'] }), 'input');
});

test('texto antigo acima da caixa de entrada não conta como input', () => {
  assert.equal(paneState({ cmd: 'claude', tail: ['> citação antiga', 'a', 'b', 'c', '│ >  │'] }), 'clear');
});

test('diálogo vence input', () => {
  assert.equal(paneState({ cmd: 'claude', tail: ['❯ 1. Yes', '│ > x │'] }), 'dialog');
});
