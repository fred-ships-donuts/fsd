// fsd-task.mjs — o cartão da tarefa (F3.4: T3.4.1 tarefa vira mensagem, T3.4.5 cartão reinjetado).
//   acceptanceOf(body)                  os itens da seção "## Acceptance" do issue, na ordem (lista com -, * ou 1.)
//   taskCard({ task, issue, notes })    o texto do cartão: card, tipo, aceite numerado, contrato, Definition of Done e o comando
//                                       de entrega com --aceite N (a rastreabilidade da F3.7 confere os N itens)
//   saveCard(agent, text) · loadCard(agent) · clearCard(agent)   $FSD_STATE/session-state/<agente>.card.md
import { readFileSync, writeFileSync, mkdirSync, renameSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { loadSchema } from './fsd-contract.mjs';
import { roleStateDir, shareMode } from './fsd-lib.mjs';

export const CONTRACT_OF = { correcao: 'entrega-codigo' };   // a correção entrega no mesmo contrato do código
const WHAT = {
  triagem: 'Triar o issue: decidir, dimensionar e pôr na coluna certa.',
  arquitetura: 'Escrever o plano no card e o aceite numerado; listar arquivos e riscos.',
  revisao: 'Revisar o PR no head indicado: ler o diff, conferir cada item do aceite e o CI.',
  'entrega-codigo': 'Implementar o card com testes, abrir o PR no formato e cobrir cada item do aceite.',
  correcao: 'Corrigir o que a revisão pediu no PR, no mesmo branch, e cobrir de novo cada item do aceite.',
  qa: 'Verificar o PR no head indicado: rodar cada item do aceite e gravar a evidência.',
};
export function acceptanceOf(body) {
  const m = /^##\s+Acceptance\b[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/im.exec(String(body || ''));
  if (!m) return [];
  return m[1].split('\n').map((l) => /^\s*(?:[-*]|\d+[.)])\s+(?:\[[ x]\]\s+)?(.+?)\s*$/i.exec(l)?.[1]).filter(Boolean);
}
export function taskCard({ task, issue, notes = [] }) {
  const contract = CONTRACT_OF[task.kind] || task.kind;
  const items = acceptanceOf(issue.body);
  let dod = []; try { dod = loadSchema(contract)['x-dod'] || []; } catch {}
  const lines = [
    `[fsd-cartão] ${task.kind} · #${issue.number}${issue.title ? ` ${issue.title}` : ''}${task.head ? ` · head ${task.head}` : ''}`,
    WHAT[task.kind] || '',
    '',
    // Validação R4: a triagem é do Kevin, que dimensiona o issue; o aceite do issue não é dela.
    ...(task.kind === 'triagem' ? [] : [items.length ? `Aceite (${items.length} itens; cite cada um pelo número na entrega):` : 'Aceite: o issue não tem a seção "## Acceptance". Peça ao Kevin antes de começar (fsd-diga kevin).']),
    ...(task.kind === 'triagem' ? [] : items.map((x, i) => `${i + 1}. ${x}`)),
    ...(notes.length ? ['', 'Pedidos a atender:', ...notes.map((x) => `- ${x}`)] : []),
    '',
    `Contrato: team/contracts/${contract}.schema.json (exemplo em team/contracts/examples/${contract}/valid.json).`,
    ...(dod.length ? [`Definition of Done (todos true em "dod"): ${dod.join(', ')}.`] : []),
    task.kind === 'triagem' ? `Entregue com: fsd-issue triage ${issue.number} --entrega <arquivo.json>. Sem entrega válida o card não anda.`
      : `Entregue com: fsd-entrega <arquivo.json>${items.length ? ` --aceite ${items.length}` : ''}. Sem entrega válida o card não anda.`,
  ];
  return lines.filter((l, i, a) => !(l === '' && a[i - 1] === '')).join('\n').trim();
}
// Validação R1: o cartão e a tarefa ficam na pasta do papel (o supervisor grava, o hook do papel lê e conta os avisos do Stop).
const file = (agent) => { if (!/^[a-z0-9_-]+$/.test(agent || '')) throw new Error(`agente inválido: ${agent}`); return join(roleStateDir(agent), 'session-state', `${agent}.card.md`); };
const put = (f, data) => { mkdirSync(dirname(f), { recursive: true }); const tmp = `${f}.${process.pid}.tmp`; writeFileSync(tmp, data, { mode: shareMode(0o600) }); renameSync(tmp, f); };
// meta = { kind, n, acceptance } da tarefa: o hook Stop (T3.7.6) cobra a entrega dela. Sem meta, só o cartão (reinjeção).
export function saveCard(agent, text, meta) {
  put(file(agent), text + '\n');
  if (meta) put(taskFile(agent), JSON.stringify({ kind: meta.kind, contract: CONTRACT_OF[meta.kind] || meta.kind, n: meta.n, acceptance: meta.acceptance ?? null, at: Date.now(), blocks: 0 }) + '\n');
}
export const loadCard = (agent) => { try { return readFileSync(file(agent), 'utf8').trim(); } catch { return ''; } };
const taskFile = (agent) => file(agent).replace(/\.card\.md$/, '.task.json');
export const loadTask = (agent) => { try { return JSON.parse(readFileSync(taskFile(agent), 'utf8')); } catch { return null; } };
export const saveTask = (agent, t) => put(taskFile(agent), JSON.stringify(t) + '\n');
// Validação R23: o supervisor guarda o cartão e a tarefa de antes de abrir o turno e os devolve se a chamada falhar.
export function snapshot(agent) { const rd = (f) => { try { return readFileSync(f, 'utf8'); } catch { return null; } }; return { card: rd(file(agent)), task: rd(taskFile(agent)) }; }
export function restore(agent, snap) { for (const [f, v] of [[file(agent), snap.card], [taskFile(agent), snap.task]]) { if (v == null) rmSync(f, { force: true }); else put(f, v); } }
export const clearCard = (agent) => { rmSync(file(agent), { force: true }); rmSync(taskFile(agent), { force: true }); };
// T3.4.1: a ação turn do decide() vira o texto do turno: o cartão (se houver tarefa) e as mensagens que vão junto.
// issue = { number, title, body } do card da tarefa; messages = as do outbox cujos ids estão em action.ids.
export function turnPrompt({ action, issue, messages = [], notes = [] }) {
  const parts = [];
  if (action.task) parts.push(taskCard({ task: action.task, issue, notes }));
  const mine = messages.filter((m) => (action.ids || []).includes(m.id));
  if (mine.length) parts.push(`[fsd-mensagens: ${mine.length}]\n${mine.map((m) => `${m.from}: ${m.urgent ? '[urgente] ' : ''}${m.ref ? `${m.ref}: ` : ''}${m.text}`).join('\n')}`);
  if (!action.task) parts.push('Responda só se for necessário (fsd-diga <papel> "<texto>"). Sem tarefa nova: termine o turno.');
  return parts.join('\n\n');
}
