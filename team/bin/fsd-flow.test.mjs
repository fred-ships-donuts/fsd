import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { COLUMNS, TRANSITIONS } from './fsd-stages.mjs';
import { render, main, SKILLS, DOC, START, END } from './fsd-flow.mjs';

const BIN = new URL('.', import.meta.url).pathname;
const ROOT = join(BIN, '../..');
const cap = (a) => a[0].toUpperCase() + a.slice(1);
const quiet = (fn) => { const log = console.log; const out = []; console.log = (...a) => out.push(a.join(' ')); try { return [fn(), out.join('\n')]; } finally { console.log = log; } };

test('every column appears with its owners', () => {
  const out = render();
  for (const c of Object.values(COLUMNS)) assert.ok(out.includes(c.who.length ? `${c.base}<br/>${c.who.map(cap).join(', ')}` : c.base), c.base);
});

test('transitions only use column keys', () => {
  for (const t of TRANSITIONS) {
    assert.ok(t.from === 'any' || COLUMNS[t.from], `from ${t.from}`);
    assert.ok(COLUMNS[t.to], `to ${t.to}`);
  }
});

// Comandos que escrevem uma coluna: team/bin/<by> tem STAGE.<to> em board(...), ou chega por afterReview (fsd-lib.mjs).
const src = (f) => readFileSync(join(BIN, f), 'utf8');
const writes = (text) => [...text.matchAll(/board\([^\n]*?STAGE\.(\w+)/g)].map((m) => m[1]);

test('each command edge writes its target', () => {
  for (const t of TRANSITIONS.filter((x) => x.by !== 'manual')) {
    assert.ok(existsSync(join(BIN, t.by)), `team/bin/${t.by} não existe`);
    const direct = writes(src(t.by)).includes(t.to);
    const viaReview = /afterReview/.test(src(t.by)) && writes(src('fsd-lib.mjs')).includes(t.to);
    assert.ok(direct || viaReview, `${t.by} não escreve ${t.to}`);
  }
});

test('every column a command writes has an inbound edge', () => {
  const files = readdirSync(BIN).filter((f) => !f.includes('.test.') && !f.endsWith('.json') && f !== 'fsd-board' && f !== 'fsd-stages.mjs');
  for (const f of files) {
    for (const k of writes(src(f))) assert.ok(TRANSITIONS.some((t) => t.to === k), `${f} escreve ${k} sem aresta em TRANSITIONS`);
  }
});

test('skills named in the diagram exist', () => {
  const dirs = [join(BIN, '../common/skills'), ...readdirSync(join(BIN, '../agents')).map((a) => join(BIN, '../agents', a, 'claude/skills'))];
  for (const s of Object.values(SKILLS).flat()) assert.ok(dirs.some((d) => existsSync(join(d, s))), `skill ${s}`);
});

test('block has the detours and balanced node ids', () => {
  const out = render();
  for (const w of ['Changes Requested', 'blocked', 'ação negada', 'writing-handoffs', 'running-qa-workflow']) assert.ok(out.includes(w), w);
  assert.equal(out.split('```').length, 3);
  const defined = new Set([...out.matchAll(/^\s+(\w+)(?:\[|\(\[|\{\{)/gm)].map((m) => m[1]));
  for (const m of out.matchAll(/^\s+(\w+) (?:-->|-\.->|-\.-)(?:\|[^|]*\|)? (\w+)/gm)) for (const id of [m[1], m[2]]) assert.ok(defined.has(id), `nó ${id} sem definição`);
});

test('staleness: a changed owner makes --check fail until --write', () => {
  const dir = mkdtempSync(join(tmpdir(), 'flow-'));
  const f = join(dir, 'CONTRIBUTING.md');
  writeFileSync(f, `x\n${START}\nvelho\n${END}\ny\n`);
  const [r1, o1] = quiet(() => main(['--check'], f));
  assert.equal(r1, 1); assert.match(o1, /CONTRIBUTING\.md desatualizado/);
  assert.equal(quiet(() => main(['--write'], f))[0], 0);
  assert.equal(quiet(() => main(['--check'], f))[0], 0);
  const other = { ...COLUMNS, dev: { ...COLUMNS.dev, who: ['bob'] } };
  assert.notEqual(render(other), render());
});

test('missing markers → exit 2, file untouched', () => {
  const f = join(mkdtempSync(join(tmpdir(), 'flow-')), 'CONTRIBUTING.md');
  writeFileSync(f, 'sem marcadores\n');
  const [r, o] = quiet(() => main(['--write'], f));
  assert.equal(r, 2); assert.match(o, /sem os marcadores/);
  assert.equal(readFileSync(f, 'utf8'), 'sem marcadores\n');
});

test('the real CONTRIBUTING.md is up to date; links without copies', () => {
  assert.equal(quiet(() => main(['--check'], DOC))[0], 0);
  for (const f of ['team/README.md', 'team/common/team.md']) {
    const t = readFileSync(join(ROOT, f), 'utf8');
    assert.ok(t.includes('CONTRIBUTING.md#2-project-quadro'), f);
    assert.ok(!t.includes('flowchart') && !t.includes('flow:start'), f);
  }
});
