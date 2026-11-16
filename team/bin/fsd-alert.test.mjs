import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sanitize, resetTime, shouldAlert, clearAlert, deliver } from './fsd-alert.mjs';

const ch = (name, result, calls) => ({ name, send: () => { calls.push(name); if (result === 'throw') throw new Error('x'); return result; } });
const setup = (toast, notify, file = true, github = true) => {
  const calls = [];
  const channels = { desktop: [ch('toast', toast, calls), ch('notify-send', notify, calls)], file: () => { calls.push('file'); return file; }, github: () => { calls.push('github'); return github; } };
  return { calls, run: () => deliver({ agent: 'bob', state: 'permissão', text: 't', channels }) };
};

test('toast entrega: notify-send não roda, o arquivo é escrito, sem GitHub', () => {
  const s = setup(true, true); assert.deepEqual(s.run(), ['toast', 'file']); assert.deepEqual(s.calls, ['toast', 'file']);
});
test('toast falha e notify-send entrega: notify-send vale; arquivo sim, GitHub não', () => {
  const s = setup(false, true); assert.deepEqual(s.run(), ['notify-send', 'file']); assert.deepEqual(s.calls, ['toast', 'notify-send', 'file']);
});
test('nenhum desktop entrega: arquivo e GitHub', () => {
  const s = setup(false, false); assert.deepEqual(s.run(), ['file', 'github']);
});
test('canal que lança não para os outros', () => {
  const s = setup('throw', 'throw'); assert.deepEqual(s.run(), ['file', 'github']);
  const t = setup(true, true, 'throw', true); assert.deepEqual(t.run(), ['toast']);
});
test('sem canais: lista vazia, sem lançar', () => {
  assert.deepEqual(deliver({ agent: 'a', state: 's', text: 't', channels: {} }), []);
  assert.deepEqual(deliver({ agent: 'a', state: 's', text: 't' }), []);
});

test('shouldAlert: true uma vez por estado, falso no mesmo, true de novo depois de clearAlert', () => {
  const mem = {};
  assert.equal(shouldAlert(mem, 'bob', 'permissão'), true);
  assert.equal(shouldAlert(mem, 'bob', 'permissão'), false);
  assert.equal(shouldAlert(mem, 'mel', 'permissão'), true);
  assert.equal(shouldAlert(mem, 'bob', 'limite de uso'), true);
  clearAlert(mem, 'bob'); assert.equal(shouldAlert(mem, 'bob', 'limite de uso'), true);
});

test('resetTime: texto depois de "resets at", "limit will reset at" e "resets"; senão desconhecido', () => {
  assert.equal(resetTime('Claude usage limit reached. Your limit will reset at 3pm (America/Sao_Paulo)'), '3pm (America/Sao_Paulo)');
  assert.equal(resetTime('You hit your limit · resets 10:30pm'), '10:30pm');
  assert.equal(resetTime('limit resets at 5am'), '5am');
  assert.equal(resetTime('nada aqui'), 'desconhecido');
  assert.equal(resetTime(''), 'desconhecido');
  assert.equal(resetTime('resets at ' + 'x'.repeat(100)).length, 40);
});

test('sanitize: tira controle e quebra de linha, junta espaços, corta no limite', () => {
  assert.equal(sanitize('a\nb\u0007\tc   d'), 'a b c d');
  assert.equal(sanitize('x'.repeat(50), 10), 'x'.repeat(10));
  assert.equal(sanitize(undefined), '');
});

test('deliver põe só texto saneado nos canais', () => {
  let got; deliver({ agent: 'b\nob', state: 's', text: 'a\r\nb', channels: { file: (m) => { got = m; return true; } } });
  assert.deepEqual(got, { agent: 'b ob', state: 's', text: 'a b' });
});

test('limite de uso só alerta: o classify do fsd-watch nunca devolve restart para ele', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('./fsd-watch', import.meta.url), 'utf8');
  const line = src.split('\n').find((l) => l.includes("state: 'limite de uso'"));
  assert.ok(line, 'a linha do limite de uso existe');
  assert.match(line, /act: 'alert'/);
  assert.doesNotMatch(line, /restart/);
});
