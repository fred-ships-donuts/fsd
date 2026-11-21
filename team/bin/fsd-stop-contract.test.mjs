// T3.7.6: hook Stop ligado ao contrato. Com tarefa ativa, encerrar sem a entrega válida faz o turno continuar ("continue: falta …");
// a entrega válida (fsd-entrega) libera; no máximo 3 bloqueios, e aí o Kevin é avisado. Sem tarefa, nada muda.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, utimesSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'stopc-'));
const T = await import('./fsd-task.mjs');
const M = await import('./fsd-messenger.mjs');
const fresh = () => { process.env.FSD_STATE = mkdtempSync(join(tmpdir(), 'stopc-')); };
const EX = join(BIN, '..', 'contracts', 'examples', 'entrega-codigo', 'valid.json');   // card 12, aceite 1 e 2
const entrega = () => spawnSync(join(BIN, 'fsd-entrega'), [EX, '--aceite', '2'], { encoding: 'utf8', env: { ...process.env } });

test('no task → Stop passes and marks idle', () => { fresh(); assert.equal(M.hook('Stop', {}, 'stuart'), null); assert.equal(M.sessionState('stuart').state, 'idle'); });

test('task without delivery → block with the fix; a valid fsd-entrega → Stop passes', () => {
  fresh(); T.saveCard('stuart', 'cartão', { kind: 'entrega-codigo', n: 12, acceptance: 2 });
  const b = M.hook('Stop', {}, 'stuart');
  assert.equal(b.decision, 'block'); assert.match(b.reason, /^continue: falta a entrega válida de entrega-codigo #12/); assert.match(b.reason, /fsd-entrega <arquivo\.json> --aceite 2/);
  assert.equal(M.sessionState('stuart'), null);   // bloqueado: o turno continua, não fica ocioso
  assert.equal(entrega().status, 0);
  assert.equal(M.hook('Stop', {}, 'stuart'), null); assert.equal(M.sessionState('stuart').state, 'idle');
});

test('correction uses the code contract; an old delivery (before the task) does not count', () => {
  fresh(); assert.equal(entrega().status, 0);
  const d = join(process.env.FSD_STATE, 'entregas', 'entrega-codigo');
  for (const x of readdirSync(d)) utimesSync(join(d, x), new Date(Date.now() - 3600e3), new Date(Date.now() - 3600e3));
  T.saveCard('stuart', 'cartão', { kind: 'correcao', n: 12, acceptance: 2 });
  assert.match(M.hook('Stop', {}, 'stuart').reason, /correcao #12[\s\S]*entrega-codigo\.schema\.json/);
});

test('after 3 blocks the 4th Stop passes and Kevin gets a message', () => {
  fresh(); T.saveCard('bob', 'cartão', { kind: 'qa', n: 7, acceptance: 1 });
  for (let i = 0; i < 3; i++) assert.equal(M.hook('Stop', { stop_hook_active: i > 0 }, 'bob').decision, 'block');
  assert.equal(M.hook('Stop', { stop_hook_active: true }, 'bob'), null);
  const { messages } = M.collect({ uidToRole: null });
  assert.equal(messages[0].to, 'kevin'); assert.match(messages[0].text, /bob terminou o turno sem a entrega válida de qa #7 depois de 3 avisos/);
});

test('through fsd-session-hook (session runner) the block comes out as the Stop JSON', () => {
  fresh(); T.saveCard('mel', 'cartão', { kind: 'revisao', n: 9, acceptance: 1 });
  const r = spawnSync(join(BIN, 'fsd-session-hook'), { input: JSON.stringify({ hook_event_name: 'Stop', session_id: 'm' }), encoding: 'utf8', env: { ...process.env, FSD_AGENT: 'mel', FSD_RUNNER: 'session' } });
  assert.equal(r.status, 0); const o = JSON.parse(r.stdout); assert.equal(o.decision, 'block'); assert.match(o.reason, /revisao #9/);
  const old = spawnSync(join(BIN, 'fsd-session-hook'), { input: JSON.stringify({ hook_event_name: 'Stop' }), encoding: 'utf8', env: { ...process.env, FSD_AGENT: 'mel', FSD_RUNNER: '' } });
  assert.equal(old.stdout, '');
});
