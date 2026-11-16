// fsd-flow.mjs — o fluxograma do processo em CONTRIBUTING.md §2, gerado de fsd-stages.mjs (COLUMNS e TRANSITIONS).
// Mermaid entre <!-- flow:start --> e <!-- flow:end -->. Os desvios (blocked, ação negada, dúvidas) e as skills de cada etapa são texto
// mantido à mão aqui embaixo; os testes conferem só que as skills existem. Saída determinística. Sem efeitos colaterais ao importar.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { COLUMNS, TRANSITIONS } from './fsd-stages.mjs';

export const START = '<!-- flow:start -->';
export const END = '<!-- flow:end -->';
export const DOC = new URL('../../CONTRIBUTING.md', import.meta.url).pathname;

// Skill usada em cada etapa (chave de COLUMNS), mantida à mão.
export const SKILLS = {
  arch: ['writing-handoffs'],
  dev: ['running-dev-workflow', 'self-reviewing-changes'],
  review: ['reviewing-prs', 'running-qa-workflow'],
};
// Colunas de trabalho onde o card pode ficar com a label blocked.
const BLOCKABLE = ['arch', 'dev', 'changes'];

const cap = (a) => a[0].toUpperCase() + a.slice(1);
const q = (s) => `"${String(s).replace(/"/g, "'")}"`;

export function render(columns = COLUMNS, transitions = TRANSITIONS) {
  const L = ['flowchart TD'];
  for (const [k, c] of Object.entries(columns)) L.push(`  ${k}[${q(c.base + (c.who.length ? '<br/>' + c.who.map(cap).join(', ') : ''))}]`);
  L.push(`  any([${q('qualquer coluna')}])`);
  const edges = new Map();
  for (const t of transitions) { const key = `${t.from}>${t.to}`; edges.set(key, [...(edges.get(key) || []), t.by]); }
  for (const [key, by] of edges) { const [f, t] = key.split('>'); L.push(`  ${f} -->|${q(by.join(', '))}| ${t}`); }
  L.push('  blocked{{"label blocked<br/>Kevin tira"}}');
  for (const k of BLOCKABLE) L.push(`  ${k} -.-> blocked`);
  for (const [k, list] of Object.entries(SKILLS)) { L.push(`  sk_${k}[${q('skill: ' + list.join(', '))}]`); L.push(`  sk_${k} -.- ${k}`); }
  L.push('  denied{{"ação negada?"}} --> team["comando do time<br/>team/common/team.md"]');
  L.push('  tech{{"dúvida técnica?"}} --> mel["Mel decide"]');
  L.push('  prod{{"dúvida de produto?"}} --> kevin["Kevin decide"]');
  return '```mermaid\n' + L.join('\n') + '\n```';
}

function span(md) {
  const a = md.indexOf(START); const b = md.indexOf(END);
  return a < 0 || b < a ? null : [a + START.length, b];
}

export function main(argv, file = DOC) {
  const [flag] = argv;
  if (flag === '--print') { console.log(render()); return 0; }
  if (flag !== '--write' && flag !== '--check') { console.log('uso: fsd-flow --write | --check | --print'); return 2; }
  if (!existsSync(file)) { console.log(`fsd-flow: ${file} não existe`); return 2; }
  const md = readFileSync(file, 'utf8'); const at = span(md);
  if (!at) { console.log(`fsd-flow: CONTRIBUTING.md sem os marcadores ${START} / ${END}`); return 2; }
  const next = md.slice(0, at[0]) + '\n' + render() + '\n' + md.slice(at[1]);
  if (flag === '--check') {
    if (next !== md) { console.log('fsd-flow: CONTRIBUTING.md desatualizado: rode fsd-flow --write'); return 1; }
    console.log('fsd-flow: CONTRIBUTING.md em dia'); return 0;
  }
  if (next !== md) writeFileSync(file, next);
  console.log(next !== md ? 'fsd-flow: CONTRIBUTING.md atualizado' : 'fsd-flow: CONTRIBUTING.md já estava em dia'); return 0;
}
