import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// timing() guarda cache por processo: cada caso roda o fsd-timing.mjs num processo próprio, com FSD_STATE temporário
// (o agents.json é o do repositório, então os testes comparam com o valor sem arquivo local).
const BIN = join(dirname(fileURLToPath(import.meta.url)), 'fsd-timing.mjs');
const dirs = [];
afterEach(() => { while (dirs.length) rmSync(dirs.pop(), { recursive: true, force: true }); });
function run(local, keys, env = {}) {
  const d = mkdtempSync(join(tmpdir(), 'fsd-timing-')); dirs.push(d);
  if (local !== undefined) writeFileSync(join(d, 'agents.local.json'), typeof local === 'string' ? local : JSON.stringify(local));
  const clean = { ...process.env }; for (const k of ['FSD_WAIT_SECONDS', 'FSD_READY_GRACE', 'FSD_STOP_WAIT']) delete clean[k];
  const r = spawnSync(process.execPath, [BIN, ...keys], { encoding: 'utf8', env: { ...clean, FSD_STATE: d, ...env } });
  return { code: r.status, out: r.stdout.trim().split('\n'), err: r.stderr };
}

test('sem agents.local.json: vale o agents.json', () => {
  const r = run(undefined, ['readyGraceMin']);
  assert.equal(r.code, 0); assert.ok(Number(r.out[0]) > 0);
});

test('timing do local passa por cima do agents.json', () => {
  const r = run({ timing: { readyGraceMin: 3 } }, ['readyGraceMin']);
  assert.equal(r.code, 0); assert.equal(r.out[0], '3');
});

test('merge campo a campo: watch.idleMin sozinho não apaga o resto de watch', () => {
  const base = run(undefined, ['watch.loopSeconds', 'watch.idleMin']);
  const r = run({ timing: { watch: { idleMin: 42 } } }, ['watch.loopSeconds', 'watch.idleMin']);
  assert.equal(r.code, 0); assert.deepEqual(r.out, [base.out[0], '42']);
});

test('variável de ambiente vence o local', () => {
  const r = run({ timing: { readyGraceMin: 3 } }, ['readyGraceMin'], { FSD_READY_GRACE: '7' });
  assert.equal(r.out[0], '7');
});

test('JSON inválido no local: ignora o local com aviso e vale o agents.json (não derruba vigia nem Monitor)', () => {
  const base = run(undefined, ['readyGraceMin']);
  const r = run('{ "timing": ', ['readyGraceMin']);
  assert.equal(r.code, 0); assert.equal(r.out[0], base.out[0]);
  assert.match(r.err, /agents\.local\.json inválido.*vale o agents\.json/);
});

test('local que zera um campo obrigatório: ignora o local com aviso nomeando o campo', () => {
  const base = run(undefined, ['readyGraceMin', 'watch.idleMin']);
  const r = run({ timing: { readyGraceMin: 0, watch: { idleMin: 42 } } }, ['readyGraceMin', 'watch.idleMin']);
  assert.equal(r.code, 0); assert.deepEqual(r.out, base.out);
  assert.match(r.err, /agents\.local\.json → timing deixa inválido: readyGraceMin; vale o agents\.json/);
});
