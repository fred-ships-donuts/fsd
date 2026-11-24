#!/usr/bin/env node
// fsd-usage — uso da conta do time (5h e semanal) sem gastar token do modelo (#193).
//   fsd-usage.mjs refresh   busca se o cache velho (usage.refreshSeconds) e o retry-after permitem; aplica o PAUSE por uso
//   fsd-usage.mjs status    mostra o cache
//   fsd-usage.mjs statusline     statusLine da sessão nativa: grava os rate_limits do JSON no cache do papel (budgetOk do supervisor)
//   fsd-usage.mjs stop-failure   hook StopFailure (matcher rate_limit): a conta bateu no limite → PAUSE por uso, sem esperar o
//                                endpoint (freio reativo; #214: o endpoint recusa o token do time). Sai por usage.reactiveHoldMin.
// Cache: $FSD_STATE/usage.json · token: $FSD_STATE/claude-oauth-token · lock: usage.lock (O_EXCL).
// Testes: FSD_USAGE_FIXTURE=<json {status, body, retryAfter}> (sem rede) e FSD_USAGE_NOW=<ms> (relógio).
// PAUSE.usage marca a pausa por uso; o PAUSE só é apagado quando foi este script que o criou (own: true). Um PAUSE feito à mão
// antes do limite continua depois que a janela volta.
import { readFileSync, writeFileSync, existsSync, openSync, closeSync, rmSync, statSync, renameSync, realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateDir, stateRoot, roleStateDir, pausePath, AGENTS, ghw, shareMode } from './fsd-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = 'https://api.anthropic.com/api/oauth/usage';
const now = () => Number(process.env.FSD_USAGE_NOW) || Date.now();
// Validação R12: o PAUSE e o PAUSE.usage são os do time (no nativo, na raiz do estado); o resto fica no estado de quem roda.
const P = (n) => (n === 'PAUSE' || n === 'PAUSE.usage' ? pausePath(n) : join(stateDir(), n));
const read = (f) => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
export function usageConfig() {
  const u = read(join(HERE, '..', 'agents.json'))?.claude_common?.usage;
  if (!(u?.refreshSeconds > 0) || !(u?.stopPct > 0)) throw new Error('agents.json → claude_common.usage sem refreshSeconds/stopPct');
  return u;
}
export const readCache = () => read(P('usage.json'));
// Maior uso entre as janelas de 5h e semanal: {pct, window} ou null sem cache.
export function over(cache, stopPct) {
  let worst = null;
  for (const w of ['five_hour', 'seven_day']) { const p = Number(cache?.[w]?.utilization); if (p >= stopPct && (!worst || p > worst.pct)) worst = { pct: p, window: w }; }
  return worst;
}
// Quem pode buscar agora: cache velho e fora do retry-after.
export function due(cache, refreshSeconds, t = now()) {
  if (cache?.retryAfterUntil && t < cache.retryAfterUntil) return false;
  return !cache?.fetchedAt || t - cache.fetchedAt > refreshSeconds * 1000;
}
// Usado pelo guard: dispara um refresh destacado se for a hora (o lock evita dois).
export function kick(cache, cfg) {
  if (process.env.FSD_RUNNER === 'session') return;   // nativo: sem token do endpoint; o uso vem da statusline (teamCache)
  if (!due(cache, cfg.refreshSeconds)) return;
  try { spawn(process.execPath, [join(HERE, 'fsd-usage.mjs'), 'refresh'], { detached: true, stdio: 'ignore', env: process.env }).unref(); } catch {}
}
function lock() {
  const f = P('usage.lock');
  try { if (existsSync(f) && now() - statSync(f).mtimeMs > 120000) rmSync(f, { force: true }); closeSync(openSync(f, 'wx')); return f; } catch { return null; }
}
async function fetchUsage() {
  if (process.env.FSD_USAGE_FIXTURE) return read(process.env.FSD_USAGE_FIXTURE) || { status: 500 };
  let token; try { token = readFileSync(P('claude-oauth-token'), 'utf8').trim(); } catch { return { status: 0, error: 'sem claude-oauth-token' }; }
  try {
    const r = await fetch(URL_, { headers: { authorization: `Bearer ${token}`, 'anthropic-beta': 'oauth-2025-04-20' }, signal: AbortSignal.timeout(15000) });
    return { status: r.status, retryAfter: Number(r.headers.get('retry-after')) || 0, body: r.ok ? await r.json() : null };
  } catch (e) { return { status: 0, error: String(e.message) }; }
}
const save = (c) => { const f = P('usage.json'); writeFileSync(`${f}.tmp`, JSON.stringify(c)); renameSync(`${f}.tmp`, f); };
// Um ciclo: busca se devido, grava, aplica PAUSE/despausa. Devolve o cache.
export async function refresh(cfg = usageConfig()) {
  let cache = readCache() || {};
  if (due(cache, cfg.refreshSeconds)) {
    const l = lock();
    if (l) try {
      const r = await fetchUsage();
      if (r.status === 429) cache = { ...cache, fetchedAt: now(), retryAfterUntil: now() + (r.retryAfter || 60) * 1000, retryAfter: r.retryAfter || 60 };
      else if (r.status === 200 && r.body) cache = { fetchedAt: now(), five_hour: r.body.five_hour, seven_day: r.body.seven_day };
      else cache = { ...cache, fetchedAt: now() };   // erro: tenta de novo só no próximo prazo
      save(cache);
    } finally { rmSync(l, { force: true }); }
  }
  apply(cache, cfg);
  return cache;
}
export function apply(cache, cfg) {
  const hit = over(cache, cfg.stopPct), pause = P('PAUSE'), mark = P('PAUSE.usage');
  if (hit) {
    if (!existsSync(mark)) pauseFor({ window: hit.window, resets_at: cache[hit.window].resets_at || null, pct: hit.pct },
      `Team account usage at ${hit.pct}% on the ${hit.window === 'five_hour' ? '5h' : 'weekly'} window (limit ${cfg.stopPct}%)`);
    return;
  }
  const m = read(mark); if (!m) return;
  let back;
  if (m.window === 'reactive') back = now() - m.at > (Number(cfg.reactiveHoldMin) || 60) * 60000;
  else { const w = cache?.[m.window]; back = w?.resets_at && (!m.resets_at || Date.parse(w.resets_at) > Date.parse(m.resets_at)) && Number(w.utilization) < cfg.stopPct; }
  if (back) { if (m.own) rmSync(pause, { force: true }); rmSync(mark, { force: true }); }
}
// Pausa por uso: cria o PAUSE só se não havia um (own diz se foi este script), grava o PAUSE.usage e comenta na #147.
function pauseFor(info, why) {
  const pause = P('PAUSE'), mark = P('PAUSE.usage'); const own = !existsSync(pause);
  if (own) writeFileSync(pause, `usage ${info.window} ${info.pct ?? ''}%\n`);
  writeFileSync(mark, JSON.stringify({ ...info, own, at: now() }));
  ghw(['issue', 'comment', '147', '--body', `${why}: ${own ? 'PAUSE created' : 'PAUSE was already on (kept as is)'}, agents wrap up and stop. ${own ? 'It is removed when the window resets.' : 'The manual PAUSE stays after the window resets.'}`], { allowFail: true });
}
// Freio reativo (hook StopFailure com matcher rate_limit): a conta já bateu no limite. Sem resets_at, a pausa sai depois de
// usage.reactiveHoldMin minutos; se a conta ainda estiver no limite, a próxima sessão bate de novo e pausa outra vez.
export function stopFailure(cfg = usageConfig()) {
  // Validação R12: no time nativo a sessão do papel não grava a raiz; pede a pausa na própria pasta e o supervisor a aplica.
  const role = process.env.FSD_AGENT;
  if (stateRoot() && process.env.FSD_RUNNER === 'session' && AGENTS.includes(role)) { writeFileSync(join(roleStateDir(role), 'PAUSE.request'), `${new Date(now()).toISOString()}\n`); return true; }
  if (existsSync(P('PAUSE.usage'))) return false;
  pauseFor({ window: 'reactive', resets_at: null, pct: null }, 'The team account hit its usage limit (StopFailure rate_limit)');
  return true;
}
// Time nativo (budgetOk): o endpoint recusa o token do time (#214), mas a statusline de cada sessão recebe os rate_limits da conta
// (T0.2.1). A statusline do papel grava o uso na pasta dele, no formato do cache (utilization = used_percentage), e o supervisor
// lê o mais recente entre os papéis. Janela já reiniciada (resets_at no passado) não conta.
export function fromStatusline(j, t = now()) {
  const rl = j?.rate_limits; if (!rl) return null;
  const w = (x) => (x && Number.isFinite(Number(x.used_percentage)) ? { utilization: Number(x.used_percentage), resets_at: x.resets_at ?? null } : undefined);
  const c = { fetchedAt: t, source: 'statusline', five_hour: w(rl.five_hour), seven_day: w(rl.seven_day) };
  return c.five_hour || c.seven_day ? c : null;
}
export function teamCache(roles = AGENTS, t = now()) {
  const all = [readCache(), ...(stateRoot() ? roles.map((r) => read(join(roleStateDir(r), 'usage.json'))) : [])];
  // resets_at: segundos (statusline) ou ISO (endpoint); sem ele, a janela vale.
  const resetMs = (v) => (v == null || v === '' ? Infinity : Number.isFinite(Number(v)) ? Number(v) * 1000 : Date.parse(v));
  const live = (x) => (x && !(resetMs(x.resets_at) <= t) ? x : undefined);
  let best = null;
  for (const c of all) {
    if (!c?.fetchedAt) continue;
    const k = { fetchedAt: c.fetchedAt, five_hour: live(c.five_hour), seven_day: live(c.seven_day) };
    if ((k.five_hour || k.seven_day) && (!best || k.fetchedAt > best.fetchedAt)) best = k;
  }
  return best;
}
export function statusline(input, t = now()) {
  let j = null; try { j = JSON.parse(input); } catch {}
  const c = fromStatusline(j, t);
  if (c) { const f = P('usage.json'); try { writeFileSync(`${f}.tmp`, JSON.stringify(c), { mode: shareMode(0o600) }); renameSync(`${f}.tmp`, f); } catch {} }
  // Custo acumulado da sessão (T6.3.4): o supervisor tira daí o custo de cada turno (fsd-consumo).
  const usd = Number(j?.cost?.total_cost_usd ?? NaN);
  if (j?.session_id && Number.isFinite(usd)) { const f = P('cost.json'); try { writeFileSync(`${f}.tmp`, JSON.stringify({ t, session: j.session_id, model: j.model?.id ?? null, usd, ms: Number(j.cost.total_api_duration_ms ?? NaN) }), { mode: shareMode(0o600) }); renameSync(`${f}.tmp`, f); } catch {} }
  const pct = (x) => (x ? `${Math.round(x.utilization)}%` : '-');
  return `fsd ${process.env.FSD_AGENT || ''} · 5h ${pct(c?.five_hour)} · semana ${pct(c?.seven_day)}`;
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === 'refresh') { try { await refresh(); } catch (e) { console.error(`fsd-usage: ${e.message}`); process.exit(2); } }
  else if (cmd === 'status') console.log(JSON.stringify(readCache()));
  else if (cmd === 'stop-failure') { try { stopFailure(); } catch {} process.exit(0); }   // hook: nunca falha o turno
  else if (cmd === 'statusline') { let x = ''; try { x = readFileSync(0, 'utf8'); } catch {} console.log(statusline(x)); process.exit(0); }   // nunca falha
  else { console.error('uso: fsd-usage.mjs refresh|status|stop-failure|statusline'); process.exit(2); }
}
