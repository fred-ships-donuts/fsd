// F4.10 (U): a anatomia das skills do time, no formato das skills do produto (src/skills/_i18n/fsd-ui-approval/en/).
//   README.md para humanos · evals/evals.json (≥ 2 cenários, ao menos um com o que NÃO pode fazer; os comportamentos do catálogo do
//   papel cobertos) · references/, templates/ e scripts/ citados no SKILL.md existem · template de entrega valida no contrato ·
//   cada script tem teste · subagente (agents/) com o motivo no SKILL.md. Os links entre arquivos o check-paths confere.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, existsSync, realpathSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkDelivery } from './fsd-contract.mjs';

const TEAM = join(dirname(fileURLToPath(import.meta.url)), '..');
const ROLES = ['kevin', 'mel', 'stuart', 'bob'];
const dirsOf = (p) => (existsSync(p) ? readdirSync(p).map((d) => join(p, d)).filter((d) => statSync(d).isDirectory()) : []);
// Cada skill uma vez (as comuns entram nos papéis por link); o papel de cada uma = quem a tem.
const skills = new Map();
for (const r of ROLES) for (const d of dirsOf(join(TEAM, 'agents', r, 'claude', 'skills'))) { const real = realpathSync(d); (skills.get(real) || skills.set(real, new Set()).get(real)).add(r); }
for (const d of dirsOf(join(TEAM, 'common', 'skills'))) { const real = realpathSync(d); if (!skills.has(real)) skills.set(real, new Set()); }
const files = (d, sub) => (existsSync(join(d, sub)) ? readdirSync(join(d, sub)) : []);
const evalsOf = (d) => JSON.parse(readFileSync(join(d, 'evals', 'evals.json'), 'utf8'));

for (const [d, roles] of skills) {
  const name = basename(d); const rel = d.slice(TEAM.length + 1);
  test(`F4.10 ${rel}: README, evals and the files the SKILL.md cites`, () => {
    assert.ok(existsSync(join(d, 'README.md')), 'falta README.md');
    const ev = evalsOf(d); assert.equal(ev.skill_name, name);
    assert.ok(Array.isArray(ev.evals) && ev.evals.length >= 2, 'menos de 2 cenários');
    for (const e of ev.evals) for (const k of ['id', 'name', 'prompt', 'expected_output']) assert.ok(e[k] !== undefined && e[k] !== '', `cenário sem ${k}`);
    assert.equal(new Set(ev.evals.map((e) => e.id)).size, ev.evals.length, 'id repetido');
    assert.ok(ev.evals.some((e) => /\b(NOT|NÃO|never|nunca)\b/.test(e.expected_output)), 'nenhum cenário diz o que NÃO pode fazer');
    const text = ['SKILL.md', 'SKILL.session.md', 'README.md'].filter((f) => existsSync(join(d, f))).map((f) => readFileSync(join(d, f), 'utf8')).join('\n');
    for (const m of text.matchAll(/\b((?:references|templates|scripts|agents)\/[\w.-]+)/g)) assert.ok(existsSync(join(d, m[1])), `citado e ausente: ${m[1]}`);
    for (const t of files(d, 'templates').filter((f) => f.endsWith('.json'))) {
      const j = JSON.parse(readFileSync(join(d, 'templates', t), 'utf8'));
      if (j.kind) { const r = checkDelivery(j); assert.deepEqual(r.errors, [], t); }
    }
    for (const s of files(d, 'scripts').filter((f) => !/\.test\./.test(f))) assert.ok(files(d, 'scripts').includes(s.replace(/\.(m?js|sh)$/, '.test.mjs')), `scripts/${s} sem teste`);
    // As peças novas servem aos dois times e vão para o perfil da sessão nova: nada dos termos do time no tmux (F4.3).
    const OLD = /fsd-restart|fsd-wait|fsd-notify|\bMonitor\b|\[fsd-aviso|fsd-merge/;
    for (const sub of ['references', 'templates', 'evals']) for (const f of files(d, sub)) assert.doesNotMatch(readFileSync(join(d, sub, f), 'utf8'), OLD, `${sub}/${f}`);
    assert.doesNotMatch(readFileSync(join(d, 'README.md'), 'utf8'), OLD, 'README.md');
    const skill = readFileSync(join(d, 'SKILL.md'), 'utf8');
    for (const a of files(d, 'agents')) assert.match(skill, new RegExp(`agents/${a.replace('.', '\\.')}[^\\n]*(porque|because|para|to )`, 'i'), `agents/${a} sem motivo no SKILL.md`);
    void roles;
  });
}

test('F4.10: the eval scenarios of the skills cover every behavior of the catalog (the judge has no skill)', () => {
  const cat = JSON.parse(readFileSync(join(TEAM, 'evals', 'catalog.json'), 'utf8')).behaviors.filter((b) => b.role !== 'juiz');
  const covered = new Map();   // comportamento → papéis cujas skills o cobrem
  for (const [d, roles] of skills) for (const e of evalsOf(d).evals) for (const b of e.behaviors || []) for (const r of roles.size ? roles : ['comum']) (covered.get(b) || covered.set(b, new Set()).get(b)).add(r);
  const miss = cat.filter((b) => !(covered.get(b.id) && (b.role === 'comum' || covered.get(b.id).has(b.role)))).map((b) => `${b.role}/${b.id}`);
  assert.deepEqual(miss, []);
});
