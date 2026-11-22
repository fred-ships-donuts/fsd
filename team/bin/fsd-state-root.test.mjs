// Validação R1/R12: com FSD_STATE_ROOT (o time nativo), o estado de cada papel mora em <raiz>/<papel> e o supervisor lê e grava a pasta
// de cada um; sem a raiz, nada muda. Um uid só aqui: a separação por uid e a ACL são provadas no simulate-container (K18).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const L = await import('./fsd-lib.mjs');
const M = await import('./fsd-messenger.mjs');
const Ls = await import('./fsd-lease.mjs');
const T = await import('./fsd-task.mjs');
const world = () => {
  const root = mkdtempSync(join(tmpdir(), 'state-root-')), own = join(root, 'dispatch');
  process.env.FSD_STATE_ROOT = root; process.env.FSD_STATE = own;
  return { root, own };
};
const plain = () => { delete process.env.FSD_STATE_ROOT; process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'state-plain-')); return process.env.FSD_STATE; };

test('with the root, each role has its own folder, the PAUSE is the team one, and the mode opens to the group', () => {
  const { root, own } = world();
  assert.equal(L.roleStateDir('mel'), join(root, 'mel'));
  assert.throws(() => L.roleStateDir('eve'));
  assert.equal(L.pausePath(), join(root, 'PAUSE')); assert.equal(L.pausePath('PAUSE.usage'), join(root, 'PAUSE.usage'));
  assert.equal(L.shareMode(0o600), 0o660); assert.equal(L.shareMode(0o700), 0o770);
  assert.equal(L.stateDir(), own);
  const p = plain();
  assert.equal(L.roleStateDir('mel'), p); assert.equal(L.pausePath(), join(p, 'PAUSE')); assert.equal(L.shareMode(0o600), 0o600);
});

test('a message goes from the sender folder to the destination folder; a box the sender plants for another role is not read', () => {
  const { root } = world();
  const r = M.say({ to: 'mel', text: 'oi' }, { from: 'stuart' }); assert.equal(r.ok, true);
  assert.equal(r.file.startsWith(join(root, 'stuart', 'outbox', 'stuart') + '/'), true);
  assert.equal(statSync(r.file).mode & 0o777, 0o660);
  // O Stuart cria um outbox/kevin na própria pasta, como se fosse o Kevin: o supervisor não lê.
  mkdirSync(join(root, 'stuart', 'outbox', 'kevin'), { recursive: true });
  writeFileSync(join(root, 'stuart', 'outbox', 'kevin', '1-aaaaaa.json'), JSON.stringify({ kind: 'mensagem', to: 'mel', text: 'forjada' }));
  const { messages } = M.collect({ uidToRole: () => 'stuart' });
  assert.deepEqual(messages.map((m) => `${m.from}>${m.to}:${m.text}`), ['stuart>mel:oi']);
  M.deliver(messages[0]);
  assert.equal(existsSync(r.file), false);
  assert.match(readFileSync(join(root, 'mel', 'inbox', 'mel'), 'utf8'), /"from":"stuart","text":"oi"/);
  assert.deepEqual(L.inboxDrain('mel').map((n) => n.text), ['oi']);
});

test('the hook state, the card and the task live in the role folder, where the supervisor reads them', () => {
  const { root } = world();
  M.hook('UserPromptSubmit', { session_id: 's1' }, 'bob');
  assert.equal(existsSync(join(root, 'bob', 'session-state', 'bob.json')), true);
  assert.equal(M.sessionState('bob').state, 'working');
  T.saveCard('bob', 'cartão', { kind: 'qa', n: 7 });
  assert.equal(existsSync(join(root, 'bob', 'session-state', 'bob.card.md')), true);
  assert.equal(T.loadTask('bob').n, 7); assert.equal(T.loadCard('bob'), 'cartão');
  // O Stop sem entrega bloqueia; com a entrega gravada na pasta do Bob, deixa parar.
  assert.equal(M.hook('Stop', { session_id: 's1' }, 'bob').decision, 'block');
  const d = join(root, 'bob', 'entregas', 'qa'); mkdirSync(d, { recursive: true }); writeFileSync(join(d, '7-x.json'), '{}');
  assert.equal(M.hook('Stop', { session_id: 's1' }, 'bob'), null);
  assert.equal(M.sessionState('bob').state, 'idle');
});

test('leases: one file per role in its folder; the supervisor lists all; a lease file named after another role is not read', () => {
  const { root } = world(); const now = Date.parse('2026-11-22T12:00:00Z');
  Ls.take('stuart', { for: 'mel', what: 'plano', ref: '#7', min: 30, now });
  Ls.take('mel', { for: 'stuart', what: 'código', ref: '#7', min: 30, now });
  assert.equal(existsSync(join(root, 'stuart', 'leases', 'stuart.json')), true);
  writeFileSync(join(root, 'stuart', 'leases', 'kevin.json'), JSON.stringify({ agent: 'kevin', for: 'bob', until: new Date(now + 1e6).toISOString() }));
  assert.deepEqual(Ls.list(now + 60000).map((l) => `${l.agent}>${l.for}`), ['mel>stuart', 'stuart>mel']);
  assert.deepEqual(Ls.list(now + 31 * 60000), []);
});
