// fsd-route.mjs — encaminhamento de negações e dúvidas (F3.4, T3.4.4). route() é pura; apply() executa.
//   route({ type: 'denial', agent, command, reason })        → aviso ao Kevin (pelo mensageiro) + registro em denials.jsonl.
//                                                              O autor libera o comando por PR; a sessão não trava.
//   route({ type: 'doubt', agent, topic, text, ref })       → técnica: Mel · fluxo: Kevin · autor: comentário
//                                                              "Deadlock: author decision needed" no ref (D8, o autor decide)
//   Quem pergunta não recebe a própria dúvida: técnica da Mel vai ao Kevin; fluxo do Kevin vira decisão do autor.
import { appendFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

export const TOPICS = ['tecnica', 'fluxo', 'autor'];
const short = (s, n = 160) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
export function authorComment({ agent, text, ref, author = 'FSD_AUTHOR' }) {
  return ['**Deadlock: author decision needed**', '', `@${author} ${agent} needs your decision on ${ref}.`, '', `Question: ${short(text, 1000)}`, '',
    'Options:', `1. Write a \`Decision (author, <date>)\` comment on ${ref}.`, `2. Ask the team to drop or rescope the work on ${ref}.`].join('\n');
}
export function route(ev) {
  if (ev.type === 'denial') {
    const line = `${ev.agent} teve um comando negado: ${short(ev.command)}${ev.reason ? ` (${short(ev.reason, 80)})` : ''}. A sessão segue; se o comando for necessário, abra um issue para o autor liberar por PR.`;
    return [...(ev.agent === 'kevin' ? [] : [{ type: 'message', to: 'kevin', text: line }]), { type: 'log', file: 'denials.jsonl', entry: { agent: ev.agent, command: short(ev.command, 500), reason: ev.reason || null } }];
  }
  if (ev.type === 'doubt') {
    if (!TOPICS.includes(ev.topic)) return [{ type: 'error', text: `tipo de dúvida: ${TOPICS.join(' | ')}` }];
    let topic = ev.topic;
    if (topic === 'fluxo' && ev.agent === 'kevin') topic = 'autor';   // o dono do fluxo não pergunta a si mesmo
    if (topic === 'autor') return ev.ref ? [{ type: 'comment', ref: ev.ref, body: authorComment(ev) }] : [{ type: 'error', text: 'dúvida para o autor precisa de --ref #N (o PR ou issue)' }];
    const to = topic === 'tecnica' ? (ev.agent === 'mel' ? 'kevin' : 'mel') : 'kevin';
    return [{ type: 'message', to, text: `[dúvida ${topic}] ${ev.text}`, ...(ev.ref ? { ref: ev.ref } : {}) }];
  }
  return [{ type: 'error', text: `evento desconhecido: ${ev.type}` }];
}
// Executa as ações: mensagem pelo mensageiro (remetente = quem perguntou), registro no estado, comentário pelo gh do agente.
export async function apply(actions, { agent }) {
  const out = [];
  for (const a of actions) {
    if (a.type === 'message') { const { say } = await import('./fsd-messenger.mjs'); const r = say({ to: a.to, text: a.text, ref: a.ref }, { from: agent }); out.push(r.ok ? `para ${a.to}` : `não gravada: ${r.errors.join('; ')}`); }
    else if (a.type === 'log') { const { stateDir } = await import('./fsd-lib.mjs'); mkdirSync(stateDir(), { recursive: true }); appendFileSync(join(stateDir(), a.file), JSON.stringify({ t: new Date().toISOString(), ...a.entry }) + '\n'); out.push(`registrado em ${a.file}`); }
    else if (a.type === 'comment') { const L = await import('./fsd-lib.mjs'); L.ghw(['issue', 'comment', a.ref.replace(/^#/, ''), '--body-file', '-'], { input: a.body }); out.push(`comentário no ${a.ref}`); }
    else if (a.type === 'error') out.push(`erro: ${a.text}`);
  }
  return out;
}
