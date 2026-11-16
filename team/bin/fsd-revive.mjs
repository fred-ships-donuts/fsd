#!/usr/bin/env node
// fsd-revive — qualquer agente sobe o vigia de novo se ele morreu (#197), sem root e sem token.
//   import { reviveWatcher } from './fsd-revive.mjs'   · CLI: fsd-revive.mjs [quem]   (o fsd-agent chama ao subir uma sessão)
// Sobe `fsd-watch --fix --loop` destacado quando watch.beat é mais velho que 3 rodadas (timing.watch.loopSeconds × 3) E o pid de
// watch.pid está morto (ou não há pid). Vigia vivo, mesmo com beat velho, não é tocado. O pid file do próprio vigia (wx) garante um só,
// mesmo se dois agentes chamarem juntos. Uma linha no watch.log diz quem subiu e por quê. Erro nunca derruba quem chama.
// Testes: FSD_REVIVE_CMD=<script> troca o fsd-watch por um script (sem laço de verdade).
import { readFileSync, statSync, appendFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateDir } from './fsd-lib.mjs';
import { timing } from './fsd-timing.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// Devolve o motivo (string) se o vigia precisa subir, ou null. t = hora em ms (testes).
export function watcherDown(dir = stateDir(), loopSeconds = Number(timing().watch.loopSeconds), t = Date.now()) {
  let pid = 0; try { pid = Number(readFileSync(join(dir, 'watch.pid'), 'utf8').trim()); } catch {}
  if (Number.isInteger(pid) && pid > 0 && alive(pid)) return null;
  let age; try { age = t - statSync(join(dir, 'watch.beat')).mtimeMs; } catch { return 'sem watch.beat e sem pid vivo'; }
  return age > loopSeconds * 3000 ? `watch.beat parado há ${Math.round(age / 1000)}s e pid morto` : null;
}
export function reviveWatcher(who = process.env.FSD_AGENT || 'agente') {
  try {
    const dir = stateDir(), why = watcherDown(dir);
    if (!why) return false;
    const cmd = process.env.FSD_REVIVE_CMD || join(HERE, 'fsd-watch'), args = process.env.FSD_REVIVE_CMD ? [] : ['--fix', '--loop'];
    spawn(cmd, args, { detached: true, stdio: 'ignore', env: process.env }).on('error', () => {}).unref();
    try { appendFileSync(join(dir, 'watch.log'), `${new Date().toISOString()} ${who} subiu o vigia: ${why}\n`); } catch {}
    return true;
  } catch { return false; }
}
if (process.argv[1] && process.argv[1] === fileURLToPath(import.meta.url)) reviveWatcher(process.argv[2]);
