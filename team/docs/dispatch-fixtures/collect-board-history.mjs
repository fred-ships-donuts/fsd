#!/usr/bin/env node
// collect-board-history.mjs [saída] — lê do GitHub (só leitura, gh do autor ou do agente) as mudanças de coluna do quadro
// (ProjectV2ItemStatusChangedEvent) de todos os issues e PRs do repositório e grava board-history.json: uma linha por tipo de
// transição (de → para, quem moveu), com a contagem e o primeiro e o último exemplo. Sem parênteses do responsável no nome
// (o nome da coluna mudou com o tempo). As divergências explicadas (divergences) do arquivo anterior são mantidas.
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || join(HERE, 'board-history.json');
const [owner, name] = JSON.parse(readFileSync(join(HERE, '..', '..', 'agents.json'), 'utf8')).repo.split('/');
const GH = process.env.FSD_REAL_GH || 'gh';
const EV = 'timelineItems(first:100,itemTypes:[PROJECT_V2_ITEM_STATUS_CHANGED_EVENT]){nodes{... on ProjectV2ItemStatusChangedEvent{createdAt actor{login} previousStatus status}}}';
const page = (kind, after) => JSON.parse(execFileSync(GH, ['api', 'graphql', '-f', `query={repository(owner:${JSON.stringify(owner)},name:${JSON.stringify(name)}){${kind}(first:100${after ? `,after:${JSON.stringify(after)}` : ''}){pageInfo{hasNextPage endCursor} nodes{number ${EV}}}}}`], { maxBuffer: 1 << 26, encoding: 'utf8' })).data.repository[kind];
const events = [];
for (const kind of ['issues', 'pullRequests']) {
  let after = null;
  do { const p = page(kind, after); for (const n of p.nodes) for (const e of n.timelineItems.nodes) events.push({ kind: kind === 'issues' ? 'issue' : 'pr', n: n.number, at: e.createdAt, by: e.actor?.login || '?', from: e.previousStatus || '', to: e.status || '' }); after = p.pageInfo.hasNextPage ? p.pageInfo.endCursor : null; } while (after);
}
const base = (s) => String(s).replace(/ \(.*\)$/, '');
const rows = new Map();
for (const e of events.sort((a, b) => a.at.localeCompare(b.at))) {
  const key = `${e.kind}|${base(e.from)}|${base(e.to)}|${e.by}`;
  const r = rows.get(key) || { kind: e.kind, from: base(e.from), to: base(e.to), by: e.by, count: 0, first: null, last: null };
  r.count++; r.first ||= `#${e.n} ${e.at}`; r.last = `#${e.n} ${e.at}`; rows.set(key, r);
}
let prev = {}; try { prev = JSON.parse(readFileSync(OUT, 'utf8')); } catch {}
const out = { _comment: prev._comment || '', collectedAt: new Date().toISOString(), events: events.length,
  transitions: [...rows.values()].sort((a, b) => b.count - a.count || `${a.from}${a.to}${a.by}`.localeCompare(`${b.from}${b.to}${b.by}`)),
  divergences: prev.divergences || {} };
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`${events.length} eventos, ${out.transitions.length} tipos de transição → ${OUT}`);
