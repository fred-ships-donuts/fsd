// fsd-denied.mjs — negação do classificador (#160). O hook PermissionDenied só GRAVA (id da linha de redirects.json + tool_use_id,
// nunca o tool_input); o PreToolUse/PostToolUse seguinte LÊ e consome (uso único, TTL). O tool_use_id evita contar duas vezes. Um arquivo por sessão em <estado>/denied/, 0600, escrita atômica.
import { readFileSync, writeFileSync, renameSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const UNMATCHED = '_unmatched';   // negação sem linha em redirects.json
export const TTL_MS = 10 * 60 * 1000;
const SEEN_MAX = 20;
export const deniedDir = () => join(process.env.FSD_STATE || join(process.env.HOME || '', '.config', 'fsd-agents'), 'denied');
const fileOf = (dir, session) => join(dir, `${String(session).replace(/[^A-Za-z0-9_-]/g, '_')}.json`);
function read(f) { try { const j = JSON.parse(readFileSync(f, 'utf8')); return { pending: j.pending ?? null, seen: Array.isArray(j.seen) ? j.seen : [] }; } catch { return { pending: null, seen: [] }; } }
function write(dir, f, st) { mkdirSync(dir, { recursive: true }); const t = `${f}.${process.pid}.tmp`; writeFileSync(t, JSON.stringify(st), { mode: 0o600 }); renameSync(t, f); }

// Grava a negação (um pendente por vez: uma negação nova sobrescreve a não consumida).  Devolve false se o tool_use_id já foi visto (dedup) ou faltam dados.
export function record({ dir = deniedDir(), session, toolUseId, id, now = Date.now() }) {
  if (!session || !toolUseId || !id) return false;
  const f = fileOf(dir, session); const st = read(f);
  if (st.seen.includes(toolUseId)) return false;
  write(dir, f, { pending: { id, toolUseId, at: now }, seen: [...st.seen, toolUseId].slice(-SEEN_MAX) });
  return true;
}
// Lê e consome: devolve o id da linha ou null (nada pendente, ou vencido pelo TTL).
export function consume({ dir = deniedDir(), session, now = Date.now(), ttl = TTL_MS }) {
  if (!session) return null;
  const f = fileOf(dir, session); const st = read(f);
  if (!st.pending) return null;
  write(dir, f, { pending: null, seen: st.seen });
  return now - st.pending.at <= ttl ? st.pending.id : null;
}
