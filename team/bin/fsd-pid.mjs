// fsd-pid.mjs — pid file com identidade (F1.8). Sem E/S ao importar.
// Conteúdo: {"pid":N,"start":<starttime de /proc/N/stat, em ticks desde o boot>,"boot":"<boot_id>"}. Vivo = mesmo boot, mesmo
// starttime e kill -0 (EPERM conta como vivo). Assim um pid reaproveitado por outro processo (ou depois de um reboot) não conta.
// Arquivo antigo (só o número): vale o kill -0, como antes; some na próxima partida do laço. Sem /proc (macOS): só kill -0.
import { readFileSync, openSync, writeSync, closeSync, unlinkSync } from 'node:fs';

const readOr = (f, d = null) => { try { return readFileSync(f, 'utf8'); } catch { return d; } };
export const bootId = () => (readOr('/proc/sys/kernel/random/boot_id') || '').trim() || null;
// Campo 22 do /proc/<pid>/stat. O nome (campo 2) pode ter espaços e parênteses: corta depois do último ")".
export function startTime(pid) {
  const s = readOr(`/proc/${pid}/stat`); if (!s) return null;
  const f = s.slice(s.lastIndexOf(')') + 2).split(' ');
  return f[19] || null;   // campos 3.. → índice 0 = campo 3; o 22 é o índice 19
}
export const identity = (pid = process.pid) => ({ pid, start: startTime(pid), boot: bootId() });
export function parsePid(text) {
  const t = String(text ?? '').trim(); if (!t) return null;
  if (/^\d+$/.test(t)) return { pid: Number(t) };
  try { const j = JSON.parse(t); return Number.isInteger(j?.pid) && j.pid > 0 ? j : null; } catch { return null; }
}
const kill0 = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// rec = parsePid(...). now = identity do pid agora (testes trocam).
export function recordAlive(rec, now = rec ? { start: startTime(rec.pid), boot: bootId() } : null) {
  if (!rec || !Number.isInteger(rec.pid) || rec.pid <= 0) return false;
  if (rec.boot && now.boot && rec.boot !== now.boot) return false;
  if (rec.start && now.boot !== null) { if (now.start === null || now.start !== rec.start) return false; }
  return kill0(rec.pid);
}
export const readPidFile = (file) => parsePid(readOr(file));
export const pidFileAlive = (file) => recordAlive(readPidFile(file));
export const ownsPidFile = (file, pid = process.pid) => readPidFile(file)?.pid === pid;
export function freePidFile(file, pid = process.pid) { try { if (ownsPidFile(file, pid)) unlinkSync(file); } catch {} }
// Um laço só: cria com wx; pid file de processo morto (ou de outro dono do mesmo número) é assumido. Devolve
// { ok: true } ou { ok: false, pid } (outro vivo) ou { ok: false, retry: true }.
export function takePidFile(file) {
  for (let i = 0; i < 3; i++) {
    try { const fd = openSync(file, 'wx'); writeSync(fd, JSON.stringify(identity())); closeSync(fd); return { ok: true }; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const rec = readPidFile(file);
      if (recordAlive(rec)) return { ok: false, pid: rec.pid };
      try { unlinkSync(file); } catch {}
    }
  }
  return { ok: false, retry: true };
}
