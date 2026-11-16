import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { context } from './fsd-context.mjs';

// context() lê o agents.json do repositório e o agents.local.json de $FSD_STATE (um diretório temporário aqui).
const dirs = [];
const oldState = process.env.FSD_STATE;
const withLocal = (obj) => {
  const d = mkdtempSync(join(tmpdir(), 'fsd-context-')); dirs.push(d);
  if (obj !== undefined) writeFileSync(join(d, 'agents.local.json'), typeof obj === 'string' ? obj : JSON.stringify(obj));
  process.env.FSD_STATE = d;
};
afterEach(() => {
  while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true });
  if (oldState === undefined) delete process.env.FSD_STATE; else process.env.FSD_STATE = oldState;
});

test('sem agents.local.json: vale o agents.json', () => {
  withLocal();
  const c = context('agente-inexistente');
  assert.ok(c.limit > 0 && c.bands.normal.urgentAt > 0);
});

test('merge profundo: um campo de bands no local não apaga o resto de bands', () => {
  withLocal();
  const base = context('agente-inexistente');
  withLocal({ claude_common: { context: { bands: { normal: { urgentAt: 99 } } } } });
  const c = context('agente-inexistente');
  assert.equal(c.bands.normal.urgentAt, 99);
  assert.equal(c.bands.normal.mediumAt, base.bands.normal.mediumAt);
  assert.deepEqual(c.bands.heavy, base.bands.heavy);
  assert.equal(c.limit, base.limit);
});

test('precedência: json comum < local comum < local do agente (o agents.json não tem override de agente para testar)', () => {
  withLocal();
  const base = context('agente-inexistente');
  // 2º nível: agents.<nome>.context do agents.json, que também está no repositório; usa o agente real mais próximo.
  const nivel2 = context('stuart');
  withLocal({ claude_common: { context: { limit: 111111, restartAbove: 55555 } }, agents: { stuart: { context: { restartAbove: 77777 } } } });
  const stuart = context('stuart');
  assert.equal(stuart.limit, 111111, 'local comum vence o json');
  assert.equal(stuart.restartAbove, 77777, 'local do agente vence o local comum');
  assert.equal(context('agente-inexistente').restartAbove, 55555, 'sem entrada do agente, vale o local comum');
  assert.equal(stuart.marginTokens, nivel2.marginTokens, 'o que o local não toca fica como no json');
  assert.equal(base.marginTokens, nivel2.marginTokens);
});

test('o local do agente vale só para aquele agente', () => {
  withLocal();
  const comum = context('agente-inexistente');
  const stuart = context('stuart');
  withLocal({ agents: { stuart: { context: { heavyFactor: 9 } } } });
  assert.equal(context('stuart').heavyFactor, 9);
  assert.equal(context('agente-inexistente').heavyFactor, comum.heavyFactor, 'outro agente não é afetado');
  assert.equal(context('stuart').limit, stuart.limit);
});

test('JSON inválido em agents.local.json: erro claro, não valores do json', () => {
  withLocal('{ "claude_common": ');
  assert.throws(() => context('stuart'), /agents\.local\.json inválido/);
});

test('local que deixa um campo obrigatório inválido: erro de configuração nomeando o campo', () => {
  withLocal({ claude_common: { context: { limit: 0 } } });
  assert.throws(() => context('stuart'), /context sem .*limit/);
});

test('valor que não é objeto no local substitui o do json (arrays e escalares não se mesclam)', () => {
  withLocal({ claude_common: { context: { bands: 5 } } });
  assert.throws(() => context('stuart'), /bands\.normal\.urgentAt/);
});
