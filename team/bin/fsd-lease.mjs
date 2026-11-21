// fsd-lease.mjs — esperas como leases (F3.4, T3.4.3). Sem Monitor esperando, a espera não tem processo vivo para provar que
// vale: ela vence pelo prazo (until). $FSD_STATE/leases/<agente>.json, uma espera ativa por agente (a nova substitui a velha).
//   take(agent, { for, what, ref, min })   registra (min padrão: timing.waits.expireMin)
//   release(agent) · list(now)             list apaga as vencidas, as ilegíveis e as de nome fora de agents.json
//   impasses(leases, { now, activityOf, cycleMin, stallMin })   findDeadlocks sobre os leases → para o decide():
//                                          DEADLOCK vira { ref, key } em state.deadlocks (o juiz); STALLED volta à parte (aviso ao Kevin)
import { readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { AGENTS, stateDir, findDeadlocks } from './fsd-lib.mjs';
import { timing } from './fsd-timing.mjs';

export const leaseDir = () => join(stateDir(), 'leases');
const file = (a) => { if (!AGENTS.includes(a)) throw new Error(`agente desconhecido: ${a}`); return join(leaseDir(), `${a}.json`); };
export function take(agent, { for: who, what, ref, min, now = Date.now() }) {
  if (!AGENTS.includes(who) || who === agent) throw new Error(`espera por quem? ${JSON.stringify(who)} (um colega de agents.json)`);
  if (ref != null && !/^#\d+$/.test(ref)) throw new Error('ref: #N');
  const m = Number(min) > 0 ? Number(min) : Number(timing().waits.expireMin);
  const l = { agent, for: who, what: String(what || '').slice(0, 300), ref: ref ?? null, since: new Date(now).toISOString(), until: new Date(now + m * 60000).toISOString() };
  mkdirSync(leaseDir(), { recursive: true }); const f = file(agent), tmp = `${f}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(l) + '\n'); renameSync(tmp, f);
  return l;
}
export function release(agent) { try { unlinkSync(file(agent)); return true; } catch { return false; } }
export function list(now = Date.now()) {
  let names = []; try { names = readdirSync(leaseDir()).filter((f) => f.endsWith('.json')); } catch { return []; }
  const out = [];
  for (const f of names.sort()) {
    const p = join(leaseDir(), f), agent = f.slice(0, -5); let l = null; try { l = JSON.parse(readFileSync(p, 'utf8')); } catch {}
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
