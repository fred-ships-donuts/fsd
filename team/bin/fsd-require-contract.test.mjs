// T3.7.3: na sessão nova, fsd-pr open, fsd-review post e fsd-qa finish exigem o JSON do contrato (--entrega), conferido com o que o
// comando entrega (PR, head, veredito, card, branch); fsd-entrega modelo gera um JSON que valida no schema.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireDelivery, saveDelivery, checkDelivery, KINDS, DIR, sessionRunner } from './fsd-contract.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
const d = mkdtempSync(join(tmpdir(), 'req-'));
const file = (name, data) => { const f = join(d, name); writeFileSync(f, JSON.stringify(data)); return f; };
const ex = (k) => JSON.parse(readFileSync(join(DIR, 'examples', k, 'valid.json'), 'utf8'));

test('fsd-entrega modelo <kind>: the generated JSON validates against its schema, for every kind', () => {
  for (const k of KINDS()) {
    const r = spawnSync(join(BIN, 'fsd-entrega'), ['modelo', k], { encoding: 'utf8' });
    assert.equal(r.status, 0, k); assert.deepEqual(checkDelivery(JSON.parse(r.stdout)).errors, [], k);
  }
  assert.equal(spawnSync(join(BIN, 'fsd-entrega'), ['modelo', 'nada'], { encoding: 'utf8' }).status, 2);
});

test('requireDelivery: no file → the hint with the template command; bad JSON; another kind', () => {
  assert.match(requireDelivery({ kind: 'qa' }).errors[0], /falta --entrega .*fsd-entrega modelo qa/);
  writeFileSync(join(d, 'bad'), '{'); assert.match(requireDelivery({ kind: 'qa', file: join(d, 'bad') }).errors[0], /não é JSON válido/);
  assert.match(requireDelivery({ kind: 'qa', file: file('rev.json', ex('revisao')) }).errors[0], /este comando entrega qa/);
});

test('requireDelivery checks it against what the command delivers: PR, head (prefix), verdict, card, branch', () => {
  const qa = file('qa.json', ex('qa'));   // pr 220, head a1b2c3d, verdict pass
  assert.equal(requireDelivery({ kind: 'qa', file: qa, acceptance: 2, expect: { pr: 220, head: 'a1b2c3d4e5f6', verdict: 'pass' } }).ok, true);
  const e = requireDelivery({ kind: 'qa', file: qa, acceptance: 2, expect: { pr: 221, head: 'ffff000', verdict: 'fail' } }).errors.join('\n');
  assert.match(e, /\$\.pr: tem de ser 221/); assert.match(e, /\$\.head: tem de ser "ffff000"/); assert.match(e, /\$\.verdict: tem de ser "fail"/);
  const code = file('code.json', ex('entrega-codigo'));
  assert.match(requireDelivery({ kind: 'entrega-codigo', file: code, acceptance: 2, expect: { card: 13, branch: 'fix/other' } }).errors.join(), /card: tem de ser 13.*branch: tem de ser "fix\/other"/s);
  assert.match(requireDelivery({ kind: 'entrega-codigo', file: code, acceptance: 3 }).errors.join(), /falta o item 3/);
});

test('fill: the PR number the command learns after creating the PR; saveDelivery keeps the real one', () => {
  const c = ex('entrega-codigo'); delete c.pr; const f = file('nopr.json', c);
  assert.match(requireDelivery({ kind: 'entrega-codigo', file: f, acceptance: 2 }).errors.join(), /\$\.pr: obrigatório/);
  const r = requireDelivery({ kind: 'entrega-codigo', file: f, acceptance: 2, fill: { pr: 1 } }); assert.equal(r.ok, true);
  r.data.pr = 245; const st = mkdtempSync(join(tmpdir(), 'req-'));
  const out = saveDelivery(r.data, st); assert.equal(JSON.parse(readFileSync(out, 'utf8')).pr, 245);
  assert.ok(readdirSync(join(st, 'entregas', 'entrega-codigo'))[0].startsWith('12-'));
});

test('the gate is only for the session runner, and the three commands carry it', () => {
  const keep = process.env.FSD_RUNNER;
  process.env.FSD_RUNNER = ''; assert.equal(sessionRunner(), false); process.env.FSD_RUNNER = 'session'; assert.equal(sessionRunner(), true);
  if (keep === undefined) delete process.env.FSD_RUNNER; else process.env.FSD_RUNNER = keep;
  for (const [cmd, kind] of [['fsd-pr', 'entrega-codigo'], ['fsd-review', 'revisao'], ['fsd-qa', 'qa']]) {
    const src = readFileSync(join(BIN, cmd), 'utf8');
    assert.match(src, new RegExp(`requireDelivery\\(\\{ kind: '${kind}'`), cmd); assert.match(src, /C\.sessionRunner\(\)/, cmd); assert.match(src, /C\.saveDelivery\(/, cmd);
  }
});
