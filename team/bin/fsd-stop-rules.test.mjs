import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lastMessageText, tailOf, asksAuthor } from './fsd-stop-rules.mjs';
import { load } from './fsd-redirects.mjs';

const rules = load();
const asks = (t) => asksAuthor(tailOf(t), rules);

test('as quatro mensagens reais de 2026-11-15 são bloqueadas', () => {
  for (const m of ['O #115 continua parado na sua decisão: preciso saber se segue.', 'Continuo parado esperando você liberar o push.', 'Como quer seguir?', 'Preciso de uma regra de permissão no Bash']) assert.equal(asks(m), true, m);
});

test('relatório normal não é bloqueado', () => {
  assert.equal(asks('PR #135 aberto, aguardando review.'), false);
  assert.equal(asks('Feito. Build ok, 55 testes passam.\n\nPróximo: #134.'), false);
  assert.equal(asks(''), false);
});

test('frase no meio de um relatório longo não bloqueia; só o fim conta', () => {
  const long = ['Estou esperando você? não, isso foi só um exemplo.', 'a', 'b', 'c', 'd', 'Tudo entregue. PR aberto.'].join('\n');
  assert.equal(asks(long), false);
});

test('última linha com "?" bloqueia, com markdown em volta também', () => {
  assert.equal(asks('Rodei tudo.\nQuer que eu abra o PR?'), true);
  assert.equal(asks('Rodei tudo.\n**Quer que eu abra o PR?**'), true);
  assert.equal(asks('Rodei tudo?\nPronto.'), false);
});

test('tailOf: 3 linhas, no máximo 400 caracteres, sem cercas nem marcas', () => {
  assert.equal(tailOf('1\n2\n3\n4\n5'), '3\n4\n5');
  assert.ok(tailOf('x'.repeat(1000)).length <= 400);
  assert.equal(tailOf('```js\ncode\n```\n**ok**'), 'code\nok');
  assert.equal(tailOf(null), '');
});

test('padrões em inglês e o "bare aguardando" não bloqueia', () => {
  assert.equal(asks('I am waiting for you to decide.'), true);
  assert.equal(asks('Could you run this for me.'), true);
  assert.equal(asks('Aguardando review dos colegas.'), false);
});

test('lastMessageText: last_assistant_message tem prioridade', () => {
  assert.equal(lastMessageText({ last_assistant_message: 'oi', transcript_path: '/x' }, () => { throw new Error('não deveria ler'); }), 'oi');
});

test('lastMessageText: última entrada assistant com texto do transcript, ignorando tool_use', () => {
  const j = (o) => JSON.stringify(o);
  const jsonl = [
    j({ type: 'assistant', message: { content: [{ type: 'text', text: 'antiga' }] } }),
    j({ type: 'assistant', message: { content: [{ type: 'text', text: 'Como quer seguir?' }, { type: 'tool_use', name: 'Bash' }] } }),
    j({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash' }] } }),
    j({ type: 'user', message: { content: 'x' } }),
    'linha quebrada',
  ].join('\n');
  assert.equal(lastMessageText({ transcript_path: '/t' }, () => jsonl), 'Como quer seguir?');
});

test('lastMessageText: sem fonte ou arquivo ilegível → vazio, sem lançar', () => {
  assert.equal(lastMessageText({}), '');
  assert.equal(lastMessageText({ transcript_path: '/nao/existe' }), '');
  assert.equal(lastMessageText(null), '');
});
