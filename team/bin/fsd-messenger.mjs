// fsd-messenger.mjs — mensagens entre agentes (F3.3). O remetente é o dono Unix do arquivo no outbox, nunca o texto (A4).
//   say(msg, { from })            fsd-diga: grava $FSD_STATE/outbox/<from>/<id>.json (0600). O from só escolhe a pasta
//   collect({ uidToRole })        o supervisor lê os outboxes: { messages, rejected }. from = uidToRole(dono do arquivo);
//                                 sem usuário Unix por papel (antes da E2), cai no nome da pasta e marca trusted: false
//   deliver(m)                    põe na caixa do destino ($FSD_STATE/inbox/<to>, a mesma do fsd-inbox) e tira do outbox
//   hook(event, input)            hook da sessão nova (FSD_RUNNER=session): PostToolUse e UserPromptSubmit entregam a caixa
//                                 como additionalContext e marcam "working"; Stop marca "idle" ($FSD_STATE/session-state/<agente>.json)
import { readdirSync, readFileSync, writeFileSync, mkdirSync, renameSync, statSync, unlinkSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { AGENTS, CFG, stateDir, inboxAppend, inboxDrain, noticeLine } from './fsd-lib.mjs';
import { checkDelivery } from './fsd-contract.mjs';

export const outboxDir = (role) => join(stateDir(), 'outbox', ...(role ? [role] : []));
const atomic = (f, data) => { const tmp = `${f}.${process.pid}.tmp`; writeFileSync(tmp, data, { mode: 0o600 }); renameSync(tmp, f); };

export function say({ to, text, urgent = false, ref }, { from }) {
  const m = { kind: 'mensagem', from, to, text, urgent: !!urgent, ...(ref ? { ref } : {}) };
  const { errors } = checkDelivery(m);
  if (!AGENTS.includes(from)) errors.push(`$.from: ${JSON.stringify(from)} não é um agente (FSD_AGENT)`);
  if (from === to) errors.push('$.to: mensagem para si mesmo');
  if (errors.length) return { ok: false, errors };
  const dir = outboxDir(from); mkdirSync(dir, { recursive: true, mode: 0o700 });
  const id = `${Date.now()}-${randomBytes(3).toString('hex')}`; const file = join(dir, `${id}.json`);
  const { from: _ignored, ...body } = m;   // o remetente não vai no arquivo: vem do dono
  atomic(file, JSON.stringify({ ...body, at: new Date().toISOString() }) + '\n');
  return { ok: true, id, file };
}

// Usuário Unix de cada papel: agents.json → agents.<papel>.unix_user (padrão fsd-<papel>), resolvido pelo getent. Sem nenhum → null.
export function defaultUidToRole() {
  const map = new Map();
  for (const a of AGENTS) {
    const u = CFG.agents[a].unix_user || `fsd-${a}`;
    try { const line = execFileSync('getent', ['passwd', u], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); const uid = Number(line.split(':')[2]); if (Number.isInteger(uid)) map.set(uid, a); } catch {}
  }
  return map.size ? (uid) => map.get(uid) || null : null;
}
export function collect({ uidToRole = defaultUidToRole() } = {}) {
  const messages = [], rejected = [];
  let roles = []; try { roles = readdirSync(outboxDir()); } catch { return { messages, rejected }; }
  for (const dirRole of roles.sort()) {
    let files = []; try { files = readdirSync(outboxDir(dirRole)).filter((f) => f.endsWith('.json')).sort(); } catch { continue; }
    for (const f of files) {
      const file = join(outboxDir(dirRole), f);
      let body, st; try { st = statSync(file); body = JSON.parse(readFileSync(file, 'utf8')); } catch (e) { rejected.push({ file, errors: [`ilegível: ${e.message}`] }); continue; }
      const from = uidToRole ? uidToRole(st.uid) : (AGENTS.includes(dirRole) ? dirRole : null);
      const m = { kind: 'mensagem', ...body, from }; delete m.at;
      const errors = from ? checkDelivery(m).errors : [`remetente desconhecido (uid ${st.uid})`];
      if (from && m.to === from) errors.push('$.to: mensagem para si mesmo');
      if (errors.length) { rejected.push({ file, from, errors }); continue; }
      messages.push({ id: f.replace(/\.json$/, ''), file, from, to: m.to, text: m.text, urgent: !!m.urgent, ...(m.ref ? { ref: m.ref } : {}), trusted: !!uidToRole });
    }
  }
  return { messages, rejected };
}
export const messageText = (m) => `${m.urgent ? '[urgente] ' : ''}${m.ref ? `${m.ref}: ` : ''}${m.text}`;
export function deliver(m) { inboxAppend(m.to, m.from, messageText(m)); try { unlinkSync(m.file); } catch {} }

const stateFile = (agent) => join(stateDir(), 'session-state', `${agent}.json`);
export const sessionState = (agent) => { try { return JSON.parse(readFileSync(stateFile(agent), 'utf8')); } catch { return null; } };
export function hook(event, input = {}, agent = process.env.FSD_AGENT) {
  if (!AGENTS.includes(agent)) return null;
  const mark = (state) => { mkdirSync(join(stateDir(), 'session-state'), { recursive: true }); atomic(stateFile(agent), JSON.stringify({ state, at: new Date().toISOString(), session_id: input.session_id || null }) + '\n'); };
  if (event === 'Stop') { mark('idle'); return null; }
  if (event !== 'PostToolUse' && event !== 'UserPromptSubmit') return null;
  mark('working');
  const n = inboxDrain(agent); if (!n.length) return null;
  return { hookSpecificOutput: { hookEventName: event, additionalContext: `[fsd-mensagens: ${n.length}]\n${n.map(noticeLine).join('\n')}` } };
}
export const _test = { stateFile, existsSync };
