// fsd-dispatch-loop.mjs — o laço do supervisor (F3.2, T3.2.2). Uma rodada: junta o estado (gather), decide() e executa (exec), com
// diário e tarefas atribuídas no $FSD_STATE/dispatch/. Relógio, gather e exec são injetáveis (testes sem rede nem claude).
//   round({ gather, exec, now, cfg })   → { actions, done, skipped }
//   pinCode(sha, from) · runningPinned(path)   a cópia fixada do código em $FSD_STATE/dispatch/code/<sha>/team (C6/S5)
// Garantias:
//   - tarefa atribuída (tasks.json) é gravada ANTES da chamada que abre o turno: um supervisor reiniciado no meio não reenvia.
//     Se o envio se perdeu, o lease da tarefa (cfg.taskLeaseMin) vence sem entrega e o decide() manda de novo.
//   - o diário (journal.jsonl) registra intent e done/failed de cada ação; no boot, intent sem fim vira "abandoned" (reconcile).
//   - juiz uma vez por ref (judged.json); merge não repete na mesma rodada.
import { readFileSync, writeFileSync, appendFileSync, mkdirSync, renameSync, cpSync, existsSync, realpathSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { decide } from './fsd-dispatch.mjs';

export const dispatchDir = () => join(process.env.FSD_STATE || join(process.env.HOME || '', '.config', 'fsd-agents'), 'dispatch');
const read = (f, d) => { try { return JSON.parse(readFileSync(join(dispatchDir(), f), 'utf8')); } catch { return d; } };
const write = (f, v) => { mkdirSync(dispatchDir(), { recursive: true }); const p = join(dispatchDir(), f), tmp = `${p}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(v, null, 1) + '\n'); renameSync(tmp, p); };
export const loadTasks = () => read('tasks.json', {});
export const loadJudged = () => read('judged.json', []);
export const loadEod = () => read('eod.json', {});
export const saveEod = (v) => write('eod.json', v);
export const saveTasks = (v) => write('tasks.json', v);
export const loadStalled = () => read('stalled.json', {});
export const saveStalled = (v) => write('stalled.json', v);
const journal = (e) => { mkdirSync(dispatchDir(), { recursive: true }); appendFileSync(join(dispatchDir(), 'journal.jsonl'), JSON.stringify(e) + '\n'); };
export function readJournal() { try { return readFileSync(join(dispatchDir(), 'journal.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)); } catch { return []; } }
const actionId = (a) => createHash('sha256').update(JSON.stringify(a)).digest('hex').slice(0, 12);

// No boot: o que ficou só com intent (o supervisor caiu no meio) é marcado abandoned. A tarefa já está em tasks.json: não reenvia.
export function reconcile(now) {
  const open = new Map();
  for (const e of readJournal()) { if (e.phase === 'intent') open.set(e.id, e); else open.delete(e.id); }
  for (const e of open.values()) journal({ t: now, id: e.id, phase: 'abandoned', action: e.action });
  return [...open.values()].map((e) => e.action);
}

// Lease da tarefa: atribuída há mais de taskLeaseMin, com o papel fora de "working" e sem entrega → sai de tasks.json (reenvio).
function expireTasks(tasks, sessions, now, { taskLeaseMin = 120, delivered = () => false } = {}) {
  const out = { ...tasks };
  for (const [role, t] of Object.entries(tasks)) if (now - t.at > taskLeaseMin * 60000 && sessions[role]?.state !== 'working' && !delivered(role, t)) delete out[role];
  return out;
}

export async function round({ gather, exec, now = Date.now(), cfg = {} }) {
  const g = await gather();
  let tasks = expireTasks(loadTasks(), g.sessions || {}, now, cfg);
  const sessions = Object.fromEntries(Object.entries(g.sessions || {}).map(([r, s]) => [r, { ...s, ...(tasks[r] ? { task: { key: tasks[r].key } } : {}) }]));
  const judged = loadJudged();
  const actions = decide({ ...g, sessions, judged, maxConcurrent: cfg.maxConcurrent ?? g.maxConcurrent ?? 1, offline: cfg.offline ?? g.offline ?? 'byUrgency' });
  const done = [], skipped = [];
  for (const a of actions) {
    const id = actionId({ a, round: Math.floor(now / 1000) });
    journal({ t: now, id, phase: 'intent', action: a });
    const prev = tasks[a.to];
    if (a.type === 'turn' && a.task) { tasks = { ...tasks, [a.to]: { key: a.task.key, kind: a.task.kind, n: a.task.n, at: now } }; write('tasks.json', tasks); }
    if (a.type === 'judge') write('judged.json', [...new Set([...loadJudged(), a.ref])]);
    try { const r = await exec(a, g); journal({ t: now, id, phase: 'done', action: a, result: r ?? null }); done.push(a); }
    catch (e) {
      journal({ t: now, id, phase: 'failed', action: a, error: String(e.message || e).slice(0, 300) }); skipped.push(a);
      // Validação R23: o turno não abriu; a tarefa volta ao que era (senão ficava presa até o lease vencer).
      if (a.type === 'turn' && a.task) { tasks = { ...tasks }; if (prev) tasks[a.to] = prev; else delete tasks[a.to]; write('tasks.json', tasks); }
    }
  }
  return { actions, done, skipped };
}

// Cópia fixada (S5/C6): o laço roda de $FSD_STATE/dispatch/code/<sha>/team, nunca do checkout vivo. Um PR mesclado só muda o
// supervisor quando alguém fixa a cópia nova (fsd-dispatch pin) e religa o laço.
const PIN = ['bin', 'contracts', 'agents.json', 'claude-settings.json', 'redirects.json', 'judge-prompt.md', 'setup/stub-claude'];
export function pinCode(sha, teamDir) {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error(`sha inválido: ${sha}`);
  const dst = join(dispatchDir(), 'code', sha, 'team');
  for (const p of PIN) if (existsSync(join(teamDir, p))) cpSync(join(teamDir, p), join(dst, p), { recursive: true });
  write('current.json', { sha, path: dst, at: Date.now() });
  return dst;
}
export const currentPin = () => read('current.json', null);
export function runningPinned(scriptPath) {
  const cur = currentPin(); if (!cur) return false;
  try { return realpathSync(scriptPath).startsWith(realpathSync(cur.path) + '/'); } catch { return false; }
}
export const listPins = () => { try { return readdirSync(join(dispatchDir(), 'code')); } catch { return []; } };
export const _dir = dirname;
