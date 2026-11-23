// F3.1 (T3.1.1): decide(estado) → ações. Tabela de casos: cada combinação de estado das sessões, quadro, caixas, esperas,
// prioridades, PAUSE, orçamento e maxConcurrent gera a ação esperada.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decide, taskKey } from './fsd-dispatch.mjs';

const off = { state: 'off' }, idle = (id) => ({ state: 'idle', id }), working = (task) => ({ state: 'working', id: 'w', ...(task ? { task } : {}) });
const team = (o = {}) => ({ kevin: off, mel: off, stuart: off, bob: off, ...o });
const msg = (id, to, urgent = false, from = 'kevin') => ({ id, from, to, text: `m${id}`, urgent });
const turns = (a) => a.filter((x) => x.type === 'turn').map((x) => `${x.to}:${x.how}${x.task ? `:${x.task.kind}#${x.task.n}` : ''}${x.ids.length ? `+${x.ids.join(',')}` : ''}`);
const types = (a) => a.map((x) => x.type);

const CASES = [
  // [nome, estado, esperado (função que confere as ações)]
  ['nada no quadro, ninguém com mensagem → nada', { sessions: team() }, (a) => assert.deepEqual(a, [])],
  ['card em Ready for Development, Stuart desligado → acorda o Stuart com a tarefa', { sessions: team(), cards: [{ n: 5, column: 'devReady' }] },
    (a) => assert.deepEqual(turns(a), ['stuart:wake:entrega-codigo#5'])],
  ['Stuart ocioso com id → retoma a mesma conversa', { sessions: team({ stuart: idle('s1') }), cards: [{ n: 5, column: 'devReady' }] },
    (a) => { assert.deepEqual(turns(a), ['stuart:resume:entrega-codigo#5']); assert.equal(a[0].id, 's1'); }],
  ['Stuart trabalhando → nenhuma tarefa nova para ele', { sessions: team({ stuart: working() }), cards: [{ n: 5, column: 'devReady' }] },
    (a) => assert.deepEqual(a, [])],
  ['tarefa já em andamento (mesma chave) → não reenvia', { sessions: team({ stuart: { state: 'idle', id: 's', task: { key: taskKey({ n: 5 }, 'entrega-codigo') } } }), cards: [{ n: 5, column: 'devReady' }] },
    (a) => assert.deepEqual(a, [])],
  ['correção primeiro: Changes Requested antes de Ready for Development', { sessions: team(), cards: [{ n: 3, column: 'devReady' }, { n: 9, column: 'changes' }] },
    (a) => assert.deepEqual(turns(a), ['stuart:wake:correcao#9'])],
  ['um card por vez: Stuart com card em Developing não pega Ready for Development (continua o de Developing, validação R4)', { sessions: team({ stuart: idle('s') }), cards: [{ n: 4, column: 'dev' }, { n: 5, column: 'devReady' }] },
    (a) => assert.deepEqual(turns(a), ['stuart:resume:entrega-codigo#4'])],
  ['card bloqueado não gera tarefa', { sessions: team(), cards: [{ n: 5, column: 'devReady', blocked: true }] }, (a) => assert.deepEqual(a, [])],
  ['In Review → Mel e Bob; com maxConcurrent 1 só um turno (Mel, pela ordem da tabela)', { sessions: team(), cards: [{ n: 7, column: 'review', head: 'h1' }] },
    (a) => assert.deepEqual(turns(a), ['mel:wake:revisao#7'])],
  ['In Review com maxConcurrent 2 → Mel e Bob', { sessions: team(), maxConcurrent: 2, cards: [{ n: 7, column: 'review', head: 'h1' }] },
    (a) => assert.deepEqual(turns(a), ['mel:wake:revisao#7', 'bob:wake:qa#7'])],
  ['Mel já revisou este head → só o Bob', { sessions: team(), cards: [{ n: 7, column: 'review', head: 'h1', reviewedBy: ['mel'] }] },
    (a) => assert.deepEqual(turns(a), ['bob:wake:qa#7'])],
  ['maxConcurrent 1 com alguém trabalhando → nenhum turno novo', { sessions: team({ bob: working() }), cards: [{ n: 5, column: 'devReady' }] },
    (a) => assert.deepEqual(turns(a), [])],
  ['maxConcurrent 2 com um trabalhando → um turno novo', { sessions: team({ bob: working() }), maxConcurrent: 2, cards: [{ n: 5, column: 'devReady' }, { n: 6, column: 'archReady' }] },
    (a) => assert.deepEqual(turns(a), ['stuart:wake:entrega-codigo#5'])],
  ['Ready for Architecture → Mel', { sessions: team(), cards: [{ n: 6, column: 'archReady' }] }, (a) => assert.deepEqual(turns(a), ['mel:wake:arquitetura#6'])],
  ['PAUSE → nenhum turno, nenhum merge; mensagem para quem trabalha ainda vai para a caixa', { paused: true, sessions: team({ mel: working() }), cards: [{ n: 5, column: 'devReady' }, { n: 8, column: 'mergeReady', pr: 80 }], messages: [msg(1, 'mel'), msg(2, 'stuart', true)] },
    (a) => { assert.deepEqual(types(a), ['inbox', 'hold']); assert.deepEqual(a[0].ids, [1]); assert.match(a[1].why, /PAUSE/); }],
  ['orçamento estourado → sem turno, mas o merge (0 token) sai', { budgetOk: false, sessions: team(), cards: [{ n: 5, column: 'devReady' }, { n: 8, column: 'mergeReady', pr: 80 }] },
    (a) => assert.deepEqual(a, [{ type: 'merge', n: 80 }])],
  ['Ready to Merge → merge pelo supervisor, fora do maxConcurrent', { sessions: team({ bob: working() }), cards: [{ n: 8, column: 'mergeReady', pr: 80 }] },
    (a) => assert.deepEqual(a, [{ type: 'merge', n: 80 }])],
  ['mensagem para quem trabalha → caixa (hook PostToolUse)', { sessions: team({ stuart: working() }), messages: [msg(1, 'stuart'), msg(2, 'stuart')] },
    (a) => assert.deepEqual(a, [{ type: 'inbox', to: 'stuart', ids: [1, 2] }])],
  ['mensagem para ocioso ligado → turno novo na mesma conversa', { sessions: team({ mel: idle('m1') }), messages: [msg(1, 'mel')] },
    (a) => { assert.deepEqual(turns(a), ['mel:resume+1']); assert.equal(a[0].id, 'm1'); }],
  ['D11 byUrgency: comum para desligado espera; urgente religa', { sessions: team(), messages: [msg(1, 'mel'), msg(2, 'bob', true)] },
    (a) => { assert.deepEqual(turns(a), ['bob:wake+2']); assert.deepEqual(a.find((x) => x.type === 'hold'), { type: 'hold', to: 'mel', ids: [1], why: 'desligado: entrega no próximo turno (SessionStart)' }); }],
  ['D11 wait: nem urgente religa', { offline: 'wait', sessions: team(), messages: [msg(2, 'bob', true)] }, (a) => assert.deepEqual(types(a), ['hold'])],
  ['D11 wake: comum também religa', { offline: 'wake', sessions: team(), messages: [msg(1, 'mel')] }, (a) => assert.deepEqual(turns(a), ['mel:wake+1'])],
  ['tarefa e mensagem para o mesmo papel → um turno só, com as duas', { sessions: team({ stuart: idle('s') }), cards: [{ n: 5, column: 'devReady' }], messages: [msg(1, 'stuart')] },
    (a) => assert.deepEqual(turns(a), ['stuart:resume:entrega-codigo#5+1'])],
  ['mensagem para ocioso com maxConcurrent cheio → espera', { sessions: team({ bob: working(), mel: idle('m') }), messages: [msg(1, 'mel')] },
    (a) => assert.deepEqual(a, [{ type: 'hold', to: 'mel', ids: [1], why: 'maxConcurrent 1' }])],
  ['tarefa tem prioridade sobre mensagem solta no único lugar', { sessions: team({ mel: idle('m') }), cards: [{ n: 5, column: 'devReady' }], messages: [msg(1, 'mel', true)] },
    (a) => { assert.deepEqual(turns(a), ['stuart:wake:entrega-codigo#5']); assert.equal(a.find((x) => x.type === 'hold').to, 'mel'); }],
  ['impasse → juiz uma vez por ref', { sessions: team(), deadlocks: [{ ref: '#7', key: 'DEADLOCK #7' }, { ref: '#9', key: 'DEADLOCK #9' }], judged: ['#9'] },
    (a) => assert.deepEqual(a, [{ type: 'judge', ref: '#7' }])],
  ['Backlog e Done não geram tarefa', { sessions: team(), cards: ['backlog', 'done'].map((column, i) => ({ n: i + 1, column })) },
    (a) => assert.deepEqual(a, [])],
];

for (const [name, state, check] of CASES) test(name, () => check(decide(state)));

test('decide is pure: same state, same actions; the state is not changed', () => {
  const st = { sessions: team({ mel: idle('m') }), cards: [{ n: 7, column: 'review', head: 'h' }], messages: [msg(1, 'mel')] };
  const copy = JSON.parse(JSON.stringify(st));
  assert.deepEqual(decide(st), decide(st)); assert.deepEqual(st, copy);
});

test('validation R4: a card already in Developing or Architecting continues once its task is over, never twice for the same task', () => {
  const idle = { state: 'idle', id: 'a1b2c3d4' };
  const dev = { n: 12, column: 'dev' }, arch = { n: 20, column: 'arch' };
  assert.deepEqual(turns(decide({ sessions: team({ stuart: idle }), cards: [dev] })), ['stuart:resume:entrega-codigo#12']);
  assert.deepEqual(turns(decide({ sessions: team({ stuart: { ...idle, task: { key: taskKey(dev, 'entrega-codigo') } } }), cards: [dev] })), []);
  assert.deepEqual(turns(decide({ sessions: team({ mel: idle }), cards: [arch], maxConcurrent: 2 })), ['mel:resume:arquitetura#20']);
  // finishing comes before starting: the card in Developing goes before a new one in Ready for Development (which waits anyway)
  assert.deepEqual(turns(decide({ sessions: team({ stuart: idle }), cards: [{ n: 9, column: 'devReady' }, dev] })), ['stuart:resume:entrega-codigo#12']);
});

test('validation R4 (author decision): an unsized Backlog card gets one Kevin triage turn; a sized one stays put', () => {
  const idle = { state: 'idle', id: 'k1' };
  assert.deepEqual(turns(decide({ sessions: team({ kevin: idle }), cards: [{ n: 30, column: 'backlog', unsized: true }] })), ['kevin:resume:triagem#30']);
  assert.deepEqual(turns(decide({ sessions: team(), cards: [{ n: 30, column: 'backlog', unsized: true }] })), ['kevin:wake:triagem#30']);
  assert.deepEqual(turns(decide({ sessions: team({ kevin: idle }), cards: [{ n: 31, column: 'backlog' }] })), []);
  assert.deepEqual(turns(decide({ sessions: team({ kevin: { ...idle, task: { key: taskKey({ n: 30 }, 'triagem') } } }), cards: [{ n: 30, column: 'backlog', unsized: true }] })), []);
  // triage comes after the code work: with one slot, the Stuart's correction goes first
  assert.deepEqual(turns(decide({ sessions: team({ kevin: idle, stuart: { state: 'idle', id: 's1' } }), cards: [{ n: 30, column: 'backlog', unsized: true }, { n: 5, column: 'changes' }] })), ['stuart:resume:correcao#5']);
});
