// F3.4 (T3.4.1, T3.4.5): cada coluna gera a tarefa esperada como mensagem com o cartão; o cartão volta no SessionStart e em
// cada mensagem nova (UserPromptSubmit), não a cada ferramenta.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'task-'));
const T = await import('./fsd-task.mjs');
const { decide } = await import('./fsd-dispatch.mjs');
const M = await import('./fsd-messenger.mjs');
const L = await import('./fsd-lib.mjs');

const BODY = '## What\nx\n\n## Acceptance\n- [ ] CI verde mescla\n- CI vermelho recusa\n3. Pendente recusa\n\n## References\n- #188\n';
const issue = { number: 12, title: 'fsd-merge confere o CI', body: BODY };
const off = { state: 'off' }, team = { kevin: off, mel: off, stuart: off, bob: off };

test('acceptanceOf reads the numbered items of "## Acceptance" only', () => {
  assert.deepEqual(T.acceptanceOf(BODY), ['CI verde mescla', 'CI vermelho recusa', 'Pendente recusa']);
  assert.deepEqual(T.acceptanceOf('## What\nnada'), []);
  assert.deepEqual(T.acceptanceOf('## Acceptance\n* só um'), ['só um']);
});

const EXPECT = { archReady: ['mel', 'arquitetura', 'arquitetura'], devReady: ['stuart', 'entrega-codigo', 'entrega-codigo'], changes: ['stuart', 'correcao', 'entrega-codigo'], review: ['mel', 'revisao', 'revisao'] };
for (const [column, [role, kind, contract]] of Object.entries(EXPECT)) {
  test(`column ${column} → ${role} gets a ${kind} card with the ${contract} contract`, () => {
    const [a] = decide({ sessions: team, cards: [{ n: 12, column, head: 'abc1234' }] });
    assert.equal(a.type, 'turn'); assert.equal(a.to, role); assert.equal(a.task.kind, kind);
    const p = T.turnPrompt({ action: a, issue });
    assert.match(p, new RegExp(`^\\[fsd-cartão\\] ${kind} · #12 fsd-merge confere o CI`));
    assert.match(p, /1\. CI verde mescla\n2\. CI vermelho recusa\n3\. Pendente recusa/);
    assert.match(p, new RegExp(`team/contracts/${contract}\\.schema\\.json`));
    assert.match(p, /Definition of Done \(todos true em "dod"\): /);
    assert.match(p, /fsd-entrega <arquivo\.json> --aceite 3/);
  });
}
test('review with maxConcurrent 2 → Bob gets the qa card too', () => {
  const acts = decide({ sessions: team, maxConcurrent: 2, cards: [{ n: 12, column: 'review', head: 'abc1234' }] });
  assert.match(T.turnPrompt({ action: acts[1], issue }), /^\[fsd-cartão\] qa · #12/);
});

test('the turn carries the messages; a card without acceptance tells to ask Kevin; a message-only turn says to answer only if needed', () => {
  const msgs = [{ id: 'm1', from: 'mel', to: 'stuart', text: 'use o mergeGate', urgent: true, ref: '#12' }];
  const [a] = decide({ sessions: { ...team, stuart: { state: 'idle', id: 's' } }, cards: [{ n: 12, column: 'devReady' }], messages: msgs });
  assert.match(T.turnPrompt({ action: a, issue, messages: msgs, notes: ['nome da variável'] }), /Pedidos a atender:\n- nome da variável[\s\S]*\[fsd-mensagens: 1\]\nmel: \[urgente\] #12: use o mergeGate/);
  assert.match(T.taskCard({ task: { kind: 'entrega-codigo' }, issue: { number: 3, body: '' } }), /não tem a seção "## Acceptance"/);
  const [only] = decide({ sessions: { ...team, mel: { state: 'idle', id: 'm' } }, messages: [{ id: 'x', from: 'bob', to: 'mel', text: 'oi' }] });
  assert.match(T.turnPrompt({ action: only, issue: null, messages: [{ id: 'x', from: 'bob', to: 'mel', text: 'oi' }] }), /bob: oi[\s\S]*Responda só se for necessário/);
});

test('T3.4.5: the saved card comes back on SessionStart and UserPromptSubmit, not on every tool', () => {
  const card = T.taskCard({ task: { kind: 'qa', head: 'abc1234' }, issue });
  T.saveCard('bob', card);
  assert.equal(M.hook('SessionStart', {}, 'bob').hookSpecificOutput.additionalContext, card);
  L.inboxAppend('bob', 'mel', 'olhe o item 2');
  const u = M.hook('UserPromptSubmit', {}, 'bob').hookSpecificOutput.additionalContext;
  assert.ok(u.startsWith(card)); assert.match(u, /mel: olhe o item 2/);
  assert.equal(M.hook('PostToolUse', {}, 'bob'), null);
  T.clearCard('bob'); assert.equal(M.hook('SessionStart', {}, 'bob'), null);
});
