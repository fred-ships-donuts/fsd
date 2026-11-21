// F3.7: cada schema tem exemplo válido e inválidos (T3.7.1); Definition of Done por tipo (T3.7.4); rastreabilidade do aceite
// (T3.7.5); fsd-entrega grava só a válida e devolve o erro (T3.7.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, mkdtempSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { KINDS, DIR, loadSchema, checkDelivery, validate } from './fsd-contract.mjs';
import { JUDGE_SCHEMA } from './fsd-judge.mjs';
import { TASK_OF } from './fsd-dispatch.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
const ex = (k) => readdirSync(join(DIR, 'examples', k)).map((f) => ({ f, j: JSON.parse(readFileSync(join(DIR, 'examples', k, f), 'utf8')) }));

test('the seven contracts exist', () => assert.deepEqual(KINDS(), ['arquitetura', 'entrega-codigo', 'mensagem', 'qa', 'revisao', 'triagem', 'veredito']));

for (const k of ['arquitetura', 'entrega-codigo', 'mensagem', 'qa', 'revisao', 'triagem', 'veredito']) {
  test(`${k}: the valid example passes, each invalid one fails with its reason`, () => {
    const all = ex(k); const valid = all.filter((x) => x.f === 'valid.json'), bad = all.filter((x) => x.f.startsWith('invalid-'));
    assert.equal(valid.length, 1); assert.ok(bad.length >= 2, `${k}: pelo menos 2 inválidos`);
    assert.deepEqual(checkDelivery(valid[0].j).errors, []);
    for (const b of bad) { const e = checkDelivery(b.j.data).errors; assert.ok(e.some((x) => x.includes(b.j._why)), `${k}/${b.f}: ${e.join(' | ')}`); }
  });
}

test('Definition of Done: every task kind has its own fixed list, and a missing item makes it invalid', () => {
  for (const k of ['triagem', 'arquitetura', 'revisao', 'entrega-codigo', 'qa']) {
    const s = loadSchema(k); assert.ok(s['x-dod'].length >= 3, k);
    const v = ex(k).find((x) => x.f === 'valid.json').j;
    for (const item of s['x-dod']) { const c = structuredClone(v); delete c.dod[item]; assert.ok(checkDelivery(c).errors.some((e) => e.includes(`dod.${item}`)), `${k} sem ${item}`); }
  }
  const lists = ['triagem', 'arquitetura', 'revisao', 'entrega-codigo', 'qa'].map((k) => loadSchema(k)['x-dod'].join());
  assert.equal(new Set(lists).size, lists.length);   // cada tipo tem a sua lista
});

test('traceability: Stuart and Bob cite every numbered item of the card acceptance', () => {
  for (const k of ['entrega-codigo', 'qa']) {
    const v = ex(k).find((x) => x.f === 'valid.json').j;   // cita os itens 1 e 2
    assert.deepEqual(checkDelivery(v, { acceptance: 2 }).errors, []);
    assert.match(checkDelivery(v, { acceptance: 3 }).errors.join(), /falta o item 3/);
    assert.match(checkDelivery(v, { acceptance: 1 }).errors.join(), /item 2 não existe/);
  }
});

test('the verdict contract is the judge schema; every task kind of decide() has a contract', () => {
  const s = loadSchema('veredito');
  for (const [k, v] of Object.entries(JUDGE_SCHEMA.properties)) assert.deepEqual(s.properties[k], v, k);
  const kinds = Object.values(TASK_OF).flat().map((t) => (t.kind === 'correcao' ? 'entrega-codigo' : t.kind));
  for (const k of kinds) assert.ok(KINDS().includes(k), k);
});

test('validate: unknown kind, wrong type and extra fields are reported', () => {
  assert.match(checkDelivery({ kind: 'nada' }).errors[0], /tipo desconhecido/);
  assert.deepEqual(validate({ type: 'integer' }, 1.5), ['$: esperava integer, veio number']);
  assert.match(validate({ type: 'object', additionalProperties: false, properties: {} }, { x: 1 })[0], /campo desconhecido/);
});

const run = (args, state) => spawnSync(join(BIN, 'fsd-entrega'), args, { env: { ...process.env, FSD_STATE: state }, encoding: 'utf8' });
test('fsd-entrega: valid → saved (0600); invalid → nothing saved, errors and the fix command; bad usage → 2', () => {
  const st = mkdtempSync(join(tmpdir(), 'ent-')), d = mkdtempSync(join(tmpdir(), 'entf-'));
  const good = join(d, 'good.json'); writeFileSync(good, readFileSync(join(DIR, 'examples', 'entrega-codigo', 'valid.json')));
  const r = run([good, '--aceite', '2'], st); assert.equal(r.status, 0, r.stdout); assert.match(r.stdout, /válida →/);
  const saved = r.stdout.split('→ ')[1].trim(); assert.ok(existsSync(saved)); assert.ok(saved.startsWith(join(st, 'entregas', 'entrega-codigo')));
  const bad = join(d, 'bad.json'); writeFileSync(bad, JSON.stringify(JSON.parse(readFileSync(join(DIR, 'examples', 'qa', 'invalid-sem-evidencia.json'), 'utf8')).data));
  const b = run([bad], st); assert.equal(b.status, 1); assert.match(b.stdout, /entrega inválida.*card não anda/); assert.match(b.stdout, /evidence: obrigatório/); assert.match(b.stdout, /Corrija o arquivo e rode de novo: fsd-entrega/);
  assert.equal(existsSync(join(st, 'entregas', 'qa')), false);
  assert.equal(run([good, '--aceite', 'x'], st).status, 2);
  assert.equal(run([], st).status, 2);
  writeFileSync(join(d, 'nojson'), '{'); assert.equal(run([join(d, 'nojson')], st).status, 1);
});
