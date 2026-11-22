// fsd-lease.mjs — esperas como leases (F3.4, T3.4.3). Sem Monitor esperando, a espera não tem processo vivo para provar que
// vale: ela vence pelo prazo (until). $FSD_STATE/leases/<agente>.json, uma espera ativa por agente (a nova substitui a velha).
//   take(agent, { for, what, ref, min })   registra (min padrão: timing.waits.expireMin)
//   release(agent) · list(now)             list apaga as vencidas, as ilegíveis e as de nome fora de agents.json
//   impasses(leases, { now, activityOf, cycleMin, stallMin })   findDeadlocks sobre os leases → para o decide():
//                                          DEADLOCK vira { ref, key } em state.deadlocks (o juiz); STALLED volta à parte (aviso ao Kevin)
import { readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { AGENTS, stateDir, stateRoot, roleStateDir, shareMode, findDeadlocks } from './fsd-lib.mjs';
import { timing } from './fsd-timing.mjs';

// Validação R1: no time nativo o lease de cada papel fica na pasta dele, e o supervisor lê todos (list) pela ACL do grupo.
export const leaseDir = (agent) => join(agent ? roleStateDir(agent) : stateDir(), 'leases');
const file = (a) => { if (!AGENTS.includes(a)) throw new Error(`agente desconhecido: ${a}`); return join(leaseDir(a), `${a}.json`); };
export function take(agent, { for: who, what, ref, min, now = Date.now() }) {
  if (!AGENTS.includes(who) || who === agent) throw new Error(`espera por quem? ${JSON.stringify(who)} (um colega de agents.json)`);
  if (ref != null && !/^#\d+$/.test(ref)) throw new Error('ref: #N');
  const m = Number(min) > 0 ? Number(min) : Number(timing().waits.expireMin);
  const l = { agent, for: who, what: String(what || '').slice(0, 300), ref: ref ?? null, since: new Date(now).toISOString(), until: new Date(now + m * 60000).toISOString() };
  const f = file(agent), tmp = `${f}.${process.pid}.tmp`; mkdirSync(dirname(f), { recursive: true }); writeFileSync(tmp, JSON.stringify(l) + '\n', { mode: shareMode(0o644) }); renameSync(tmp, f);
  return l;
}
export function release(agent) { try { unlinkSync(file(agent)); return true; } catch { return false; } }
export function list(now = Date.now()) {
  // Com a raiz, um arquivo por papel na pasta dele (o nome que o papel der a outro arquivo ali não conta); sem ela, a pasta de sempre.
  let paths = [];
  if (stateRoot()) paths = AGENTS.map((a) => file(a)).filter((f) => existsSync(f));
  else { try { paths = readdirSync(leaseDir()).filter((f) => f.endsWith('.json')).map((f) => join(leaseDir(), f)); } catch { return []; } }
  const out = [];
  for (const p of paths.sort()) {
    const agent = p.split('/').pop().slice(0, -5); let l = null; try { l = JSON.parse(readFileSync(p, 'utf8')); } catch {}
    const ok = l && AGENTS.includes(agent) && l.agent === agent && AGENTS.includes(l.for) && Date.parse(l.until) > now;
    if (!ok) { try { unlinkSync(p); } catch {} continue; }
    out.push(l);
  }
  return out;
}
export function impasses(leases, { now, activityOf, cycleMin = Number(timing().deadlock.cycleMin), stallMin = Number(timing().deadlock.stallMin) }) {
  const f = findDeadlocks(leases, { now, activityOf, cycleMin, stallMin });
  return { deadlocks: f.filter((x) => x.kind === 'DEADLOCK').map((x) => ({ ref: x.ref, key: x.key, line: x.line })), stalled: f.filter((x) => x.kind !== 'DEADLOCK') };
}
