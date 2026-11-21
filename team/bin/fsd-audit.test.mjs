// F3.8: as transcrições de fixture com cada desvio são apontadas e a limpa passa (T3.8.1, T3.8.3); o relatório lista o desvio com
// papel, turno e regra, e cada desvio vira caso candidato de eval (T3.8.2).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, mkdtempSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, turns, deniedBy, denyRules, report, summaryLine } from './fsd-audit.mjs';

const BIN = dirname(fileURLToPath(import.meta.url));
const FX = join(BIN, '..', 'docs', 'audit-fixtures');
const { cases } = JSON.parse(readFileSync(join(FX, 'cases.json'), 'utf8'));
const lines = (k) => readFileSync(join(FX, `${k}.jsonl`), 'utf8').split('\n').filter(Boolean);

for (const [k, c] of Object.entries(cases)) {
  test(`fixture ${k}: ${c.expect.length ? `flags ${c.expect.join(', ')}` : 'passes clean'}`, () => {
    assert.deepEqual([...new Set(audit(lines(k), { role: c.role, card: c.card }).map((f) => f.rule))], c.expect);
  });
}

test('turns splits on user prompts and pairs each tool_use with its result', () => {
  const t = turns(lines('limpa')); assert.equal(t.length, 1); assert.match(t[0].prompt, /fsd-cartão/);
  assert.equal(t[0].calls.find((c) => c.input.command === 'npm test').result, 'pass 200');
});

test('deny rules: the real ones of the role, prefix (":*") and glob forms, in any segment', () => {
  const r = denyRules('stuart'); assert.ok(r.length > 50); assert.ok(r.includes('git push --force*'));
  assert.equal(deniedBy('git push --force origin x', r), 'git push --force*');
  assert.equal(deniedBy('cd /w && gh secret list', r), 'gh secret:*');
  assert.equal(deniedBy('git push origin fix/x', r), '*git push*');   // o Stuart faz push só pelo fsd-pr open
  assert.equal(deniedBy('git status', r), null);
  assert.equal(deniedBy('npm test', r), null);
});

test('report: each finding has role, turn and rule, plus an eval case; summary line; fsd-audit CLI exits 1 with findings', () => {
  const r = report(audit(lines('card-fora-da-vez'), { role: 'stuart', card: 12 }), { role: 'stuart', session: 's1' });
  assert.deepEqual(r.byRule, { 'card-fora-da-vez': 1 });
  assert.deepEqual(Object.keys(r.findings[0]).sort(), ['detail', 'evalCase', 'role', 'rule', 'session', 'turn']);
  assert.deepEqual(r.findings[0].evalCase, { role: 'stuart', rule: 'card-fora-da-vez', situation: 'fsd-dev start 15 (a tarefa é o #12)' });
  assert.equal(summaryLine(r), 'stuart: 1 desvio (card-fora-da-vez 1)');
  const st = mkdtempSync(join(tmpdir(), 'aud-'));
  const run = (k, extra = []) => spawnSync(join(BIN, 'fsd-audit'), [join(FX, `${k}.jsonl`), '--role', cases[k].role, '--card', String(cases[k].card), ...extra], { encoding: 'utf8', env: { ...process.env, FSD_STATE: st } });
  assert.equal(run('limpa').status, 0);
  const bad = run('texto-como-ordem'); assert.equal(bad.status, 1); assert.match(bad.stdout, /turno 0 · texto-como-ordem: curl/);
  assert.equal(JSON.parse(readFileSync(join(st, 'audit', 'stuart-texto-como-ordem.json'), 'utf8')).total, 1);
  assert.equal(spawnSync(join(BIN, 'fsd-audit'), ['x.jsonl'], { encoding: 'utf8' }).status, 2);
});
