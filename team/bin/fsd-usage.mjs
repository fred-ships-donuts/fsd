#!/usr/bin/env node
// fsd-usage — uso da conta do time (5h e semanal) sem gastar token do modelo (#193).
//   fsd-usage.mjs refresh   busca se o cache velho (usage.refreshSeconds) e o retry-after permitem; aplica o PAUSE por uso
//   fsd-usage.mjs status    mostra o cache
// Cache: $FSD_STATE/usage.json · token: $FSD_STATE/claude-oauth-token · lock: usage.lock (O_EXCL).
// Testes: FSD_USAGE_FIXTURE=<json {status, body, retryAfter}> (sem rede) e FSD_USAGE_NOW=<ms> (relógio).
// PAUSE criado aqui leva o PAUSE.usage; só esse é removido quando a janela volta (nunca um PAUSE feito à mão).
import { readFileSync, writeFileSync, existsSync, openSync, closeSync, rmSync, statSync, renameSync, realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateDir, ghw } from './fsd-lib.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const URL_ = 'https://api.anthropic.com/api/oauth/usage';
const now = () => Number(process.env.FSD_USAGE_NOW) || Date.now();
const P = (n) => join(stateDir(), n);
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
    if (!existsSync(mark)) {
      if (!existsSync(pause)) writeFileSync(pause, `usage ${hit.window} ${hit.pct}%\n`);
      writeFileSync(mark, JSON.stringify({ window: hit.window, resets_at: cache[hit.window].resets_at || null, pct: hit.pct, at: now() }));
      ghw(['issue', 'comment', '147', '--body', `Team account usage at ${hit.pct}% on the ${hit.window === 'five_hour' ? '5h' : 'weekly'} window (limit ${cfg.stopPct}%): PAUSE created, agents wrap up and stop. It is removed when the window resets.`], { allowFail: true });
    }
    return;
  }
  const m = read(mark); if (!m) return;
  const w = cache?.[m.window], later = w?.resets_at && (!m.resets_at || Date.parse(w.resets_at) > Date.parse(m.resets_at));
  if (later && Number(w.utilization) < cfg.stopPct) { rmSync(pause, { force: true }); rmSync(mark, { force: true }); }
}
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const cmd = process.argv[2];
  if (cmd === 'refresh') { try { await refresh(); } catch (e) { console.error(`fsd-usage: ${e.message}`); process.exit(2); } }
  else if (cmd === 'status') console.log(JSON.stringify(readCache()));
  else { console.error('uso: fsd-usage.mjs refresh|status'); process.exit(2); }
}
