#!/usr/bin/env node
// fsd-loops.mjs kill --under <dir> [--older-than <min>] [--dry] — encerra laços `fsd-watch|fsd-cleanup --loop` de teste (#198).
// Só mexe em processo cujo FSD_STATE (lido de /proc/<pid>/environ) está sob <dir>; sem FSD_STATE, ou fora de <dir>, nunca.
import { realpathSync } from 'node:fs';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const LOOP = /(^|\/)fsd-(watch|cleanup)(\.mjs)?$/;
export const isLoop = (args) => args.includes('--loop') && args.some((x) => LOOP.test(x));
export const under = (p, dir) => { const a = resolve(p), d = resolve(dir); return a === d || a.startsWith(d + sep); };
const read = (pid, f) => { try { return readFileSync(`/proc/${pid}/${f}`, 'utf8'); } catch { return ''; } };

// → [{ pid, args, state, ageMin }]
export function findLoops({ dir, olderThanMin = 0, procDir = '/proc', now = Date.now() }) {
  const out = [];
  for (const pid of readdirSync(procDir).filter((x) => /^\d+$/.test(x))) {
    if (Number(pid) === process.pid) continue;
    const args = read(pid, 'cmdline').split('\0').filter(Boolean);
    if (!isLoop(args)) continue;
    const state = read(pid, 'environ').split('\0').find((x) => x.startsWith('FSD_STATE='))?.slice(10);
    if (!state || !under(state, dir)) continue;
    let ageMin = 0; try { ageMin = (now - statSync(`${procDir}/${pid}`).ctimeMs) / 60000; } catch {}
    if (ageMin < olderThanMin) continue;
    out.push({ pid: Number(pid), args: args.slice(-3).join(' '), state, ageMin: Math.floor(ageMin) });
  }
  return out;
}
export function killLoops(opts) {
  const found = findLoops(opts);
  if (!opts.dry) for (const l of found) { try { process.kill(l.pid, 'SIGTERM'); } catch {} }
  return found;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2), opt = (k) => (a.includes(k) ? a[a.indexOf(k) + 1] : undefined);
  if (a[0] !== 'kill' || !opt('--under')) { console.error('uso: fsd-loops.mjs kill --under <dir> [--older-than <min>] [--dry]'); process.exit(2); }
  for (const l of killLoops({ dir: opt('--under'), olderThanMin: Number(opt('--older-than')) || 0, dry: a.includes('--dry') })) console.log(`${a.includes('--dry') ? 'faria: ' : ''}encerrou pid ${l.pid} (${l.args}, estado ${l.state}, ${l.ageMin} min)`);
}
