// fsd-consumo.mjs — consumo e fluxo do time nativo (E6, T6.3.4 e T6.5.1), 0 token. O supervisor grava; o fsd-stats mostra.
//   $FSD_STATE/consumo.jsonl  uma linha por turno: { t, role, session, card, kind, model, usd, seconds }
//   $FSD_STATE/colunas.jsonl  uma linha por mudança de coluna: { t, n, from, to }
// A statusline de cada papel grava o total da sessão (fsd-usage statusline → cost.json); o turno é a diferença para o total anterior.
// usd é o que o Claude Code reporta (equivalente em API), não a fatura. Linha ilegível não apaga as outras.
import { readFileSync, appendFileSync, writeFileSync, mkdirSync, renameSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
const jl = (f) => { let raw = ''; try { raw = readFileSync(f, 'utf8'); } catch {} return raw.split('\n').flatMap((l) => { try { const v = l ? JSON.parse(l) : null; return v && typeof v === 'object' ? [v] : []; } catch { return []; } }); };
const json = (f, d) => { try { return JSON.parse(readFileSync(f, 'utf8')) ?? d; } catch { return d; } };
const put = (f, v) => { mkdirSync(dirname(f), { recursive: true }); writeFileSync(`${f}.tmp`, JSON.stringify(v)); renameSync(`${f}.tmp`, f); };
const add = (f, v) => { mkdirSync(dirname(f), { recursive: true }); appendFileSync(f, JSON.stringify(v) + '\n'); };

// O custo de um turno: a diferença dentro da mesma sessão; sessão nova (ou total que encolheu) conta inteira.
export function delta(prev, cur) {
  if (!cur || !Number.isFinite(cur.usd)) return null;
  const same = prev && prev.session === cur.session && cur.usd >= prev.usd;
  const usd = same ? cur.usd - prev.usd : cur.usd, ms = !Number.isFinite(cur.ms) ? null : same && Number.isFinite(prev.ms) ? cur.ms - prev.ms : cur.ms;
  return usd > 0 ? { usd: Math.round(usd * 1e6) / 1e6, seconds: Number.isFinite(ms) ? Math.max(0, Math.round(ms / 100) / 10) : null } : null;
}
// Um papel que não está trabalhando e cujo total mudou fechou um turno. cost(role) lê o cost.json dele; tasks é o tasks.json.
export function recordTurns({ state, roles, sessions, tasks, cost, now }) {
  const f = join(state, 'consumo-last.json'), last = json(f, {}); const out = [];
  for (const r of roles) {
    if (sessions[r]?.state === 'working') continue;
    const c = cost(r), d = delta(last[r], c); if (!d) continue;
    const line = { t: now, role: r, session: c.session, card: tasks[r]?.n ?? null, kind: tasks[r]?.kind ?? null, model: c.model ?? null, ...d };
    add(join(state, 'consumo.jsonl'), line); last[r] = { session: c.session, usd: c.usd, ms: c.ms }; out.push(line);
  }
  if (out.length) put(f, last); return out;
}
export function recordColumns({ state, cards, now }) {
  const f = join(state, 'colunas-last.json'), last = json(f, {}), cur = Object.fromEntries(cards.map((c) => [c.n, c.column])); let moved = 0;
  for (const [n, to] of Object.entries(cur)) if (last[n] !== to) { if (!last[n] && to === 'done') continue; add(join(state, 'colunas.jsonl'), { t: now, n: Number(n), from: last[n] ?? null, to }); moved++; }
  if (moved) put(f, { ...last, ...cur }); return moved;
}
export const load = (state) => ({ consumo: jl(join(state, 'consumo.jsonl')), colunas: jl(join(state, 'colunas.jsonl')), desvios: audits(join(state, 'audit')) });
function audits(dir) {
  const by = {}; let fs = []; try { fs = readdirSync(dir).filter((x) => x.endsWith('.json')); } catch {}
  for (const f of fs) { const r = json(join(dir, f), null); if (r?.role) for (const v of Object.values(r.byRule || {})) by[r.role] = (by[r.role] || 0) + Number(v || 0); }
  return by;
}

const usd = (x) => `US$ ${x.toFixed(4).replace('.', ',')}`;
const dur = (s) => (s < 90 ? `${Math.round(s)}s` : s < 5400 ? `${Math.round(s / 60)}min` : `${(s / 3600).toFixed(1).replace('.', ',')}h`);
const table = (head, rows) => { const w = head.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length))); return [head, ...rows].map((r) => r.map((c, i) => c.padEnd(w[i])).join('  ').trimEnd()).join('\n'); };
export function byRoleModel(lines) {
  const g = new Map();
  for (const l of lines) { if (!Number.isFinite(l.usd)) continue; const k = `${l.role}|${l.model || '?'}`; if (!g.has(k)) g.set(k, { role: l.role, model: l.model || '?', n: 0, usd: 0, min: Infinity, max: 0, seconds: 0, timed: 0 }); const x = g.get(k); x.n++; x.usd += l.usd; x.min = Math.min(x.min, l.usd); x.max = Math.max(x.max, l.usd); if (Number.isFinite(l.seconds)) { x.seconds += l.seconds; x.timed++; } }
  return [...g.values()].sort((a, b) => a.role.localeCompare(b.role) || a.model.localeCompare(b.model));
}
export function consumoText({ consumo }) {
  const g = byRoleModel(consumo); if (!g.length) return 'consumo: nenhum turno registrado ainda';
  const cards = new Map(); for (const l of consumo) if (l.card && Number.isFinite(l.usd)) cards.set(l.card, (cards.get(l.card) || 0) + l.usd);
  const t = table(['papel', 'modelo', 'turnos', 'média', 'faixa', 'total', 'tempo médio'], g.map((x) => [x.role, x.model, String(x.n), usd(x.usd / x.n), `${usd(x.min)} a ${usd(x.max)}`, usd(x.usd), x.timed ? dur(x.seconds / x.timed) : '-']));
  return `${t}\n\ntotal ${usd(g.reduce((s, x) => s + x.usd, 0))}${cards.size ? ` · por card: ${[...cards].sort((a, b) => a[0] - b[0]).map(([n, v]) => `#${n} ${usd(v)}`).join(', ')}` : ''}`;
}
// Tempo por coluna: do momento em que o card entra até sair (ou até agora).
export function columnTime(colunas, now) {
  const at = new Map(), sum = {};
  for (const c of [...colunas].sort((a, b) => a.t - b.t)) { const p = at.get(c.n); if (p) sum[p.to] = (sum[p.to] || 0) + (c.t - p.t) / 1000; at.set(c.n, c); }
  for (const p of at.values()) if (p.to !== 'done') sum[p.to] = (sum[p.to] || 0) + (now - p.t) / 1000;
  return sum;
}
export function painelText({ consumo, colunas, desvios }, { roles, who, now }) {
  const time = columnTime(colunas, now), rework = colunas.filter((c) => c.to === 'changes'), cards = new Set(colunas.filter((c) => c.to === 'dev').map((c) => c.n));
  const rows = roles.map((r) => {
    const mine = consumo.filter((l) => l.role === r && Number.isFinite(l.usd));
    const cols = Object.keys(who).filter((k) => who[k].includes(r) && k !== 'backlog' && time[k]);
    return [r, r === 'stuart' ? `${rework.length} em ${cards.size} card(s)` : '-', String(desvios[r] || 0), mine.length ? `${usd(mine.reduce((s, l) => s + l.usd, 0))} em ${mine.length} turno(s)` : '-', cols.map((k) => `${k} ${dur(time[k])}`).join(', ') || '-'];
  });
  return table(['papel', 'retrabalho', 'desvios', 'consumo', 'tempo por coluna'], rows);
}
