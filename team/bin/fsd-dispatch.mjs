// fsd-dispatch.mjs — a decisão do supervisor de sessões e mensageiro (F3.1, T3.1.1). Pura: sem arquivo, rede, relógio ou
// processo; tudo entra em `state` e sai como uma lista de ações. Quem executa (ligar, retomar, entregar, mesclar) é o laço da F3.2.
//
// state = {
//   now,                                    ms
//   paused,                                 PAUSE ligado (o único freio; vale também o PAUSE.usage)
//   budgetOk,                               orçamento de cota (false = como PAUSE para turnos novos)
//   maxConcurrent,                          quantos agentes podem estar trabalhando ao mesmo tempo (D4: 1, depois 2)
//   offline: 'byUrgency'|'wait'|'wake',     D11: mensagem para agente desligado (padrão byUrgency: urgente religa, comum espera)
//   sessions: { <papel>: { state: 'working'|'idle'|'off', id?, task? } }   task = { key } da tarefa em andamento
//   cards: [{ n, column, blocked?, pr?, head?, reviewedBy?: [papel] }]     column = chave de COLUMNS (cardColumn já aplicado)
//   messages: [{ id, from, to, text, urgent? }]                           o que está no outbox, ainda não entregue
//   deadlocks: [{ ref, key }]                                              de findDeadlocks (fsd-lib), sem juiz ainda
//   judged: [ref]                                                          refs que já foram ao juiz
// }
// Ações (na ordem em que o laço executa):
//   { type: 'inbox', to, ids }                       destino trabalhando: vai para a caixa; o hook PostToolUse entrega
//   { type: 'turn', to, how: 'resume'|'wake', id?, task?, ids }   turno novo na mesma conversa (ocioso: stop + --resume <id>;
//                                                    desligado: religa pelo id ou abre sessão nova). Leva a tarefa e as mensagens juntas
//   { type: 'hold', to, ids, why }                   fica na caixa até o próximo turno do destino
//   { type: 'merge', n }                             card em Ready to Merge: o supervisor mescla (D2; o portão é o mergeGate)
//   { type: 'judge', ref }                           impasse: chama o juiz uma vez por ref
//   { type: 'endofday', to } · { type: 'retire', to } fim do dia: pede o fechamento; depois, aposenta a conversa (state.endOfDayAt,
//                                                    sessions[r].ctx e sessions[r].eod)
// Regras: PAUSE ou orçamento estourado → nenhum turno novo (a caixa de quem trabalha ainda recebe; o merge espera também).
// maxConcurrent conta quem já trabalha mais os turnos abertos nesta rodada. Prioridade dos turnos: correção primeiro
// (Changes Requested do Stuart), depois revisão, depois Ready for Development, depois arquitetura, depois mensagens soltas.
// O Stuart pega um card por vez: com um card em Developing ou em Changes Requested, Ready for Development não sai para ele.
import { COLUMNS } from './fsd-stages.mjs';

export const TASK_OF = {   // coluna → tarefas (papel e tipo do contrato da F3.7)
  archReady: [{ role: 'mel', kind: 'arquitetura' }],
  devReady: [{ role: 'stuart', kind: 'entrega-codigo' }],
  changes: [{ role: 'stuart', kind: 'correcao' }],
  review: [{ role: 'mel', kind: 'revisao' }, { role: 'bob', kind: 'qa' }],
  // Validação R4: card já em andamento (Developing, Architecting) continua com a mesma chave da tarefa, então só volta depois que a
  // tarefa anterior terminou sem entrega (turno acabou, lease vencido, fim do dia): o card não fica parado.
  dev: [{ role: 'stuart', kind: 'entrega-codigo' }],
  arch: [{ role: 'mel', kind: 'arquitetura' }],
};
const PRIORITY = ['changes', 'review', 'dev', 'devReady', 'arch', 'archReady'];   // correção primeiro; terminar antes de começar
export const taskKey = (card, kind) => `${kind}:#${card.n}${card.head ? `@${card.head}` : ''}`;

export function decide(state) {
  const s = { offline: 'byUrgency', maxConcurrent: 1, sessions: {}, cards: [], messages: [], deadlocks: [], judged: [], budgetOk: true, ...state };
  const out = [];
  const frozen = s.paused || !s.budgetOk;
  const sess = (r) => s.sessions[r] || { state: 'off' };
  let busy = Object.values(s.sessions).filter((x) => x.state === 'working').length;
  const turned = new Set();
  const pendingFor = (r) => s.messages.filter((m) => m.to === r);

  // 0. Fim do dia (T3.4.2, D12): sessão ociosa com contexto ≥ endOfDayAt recebe o pedido de fechamento (vale até sob PAUSE: é
  //    fechar, não começar); depois de pedido (eod) e com a sessão ociosa de novo, o supervisor a aposenta (retire, 0 token).
  if (s.endOfDayAt) for (const r of Object.keys(s.sessions).sort()) {
    const se = s.sessions[r];
    if (se.eodHold) continue;   // validação R27: o fechamento já foi pedido 3 vezes e o Kevin avisado; o papel segue trabalhando
    if (se.state === 'idle' && se.eod) { out.push({ type: 'retire', to: r, ...(se.id ? { id: se.id } : {}) }); turned.add(r); continue; }
    if (se.state === 'idle' && !se.eod && (se.ctx || 0) >= s.endOfDayAt) { out.push({ type: 'endofday', to: r, ...(se.id ? { id: se.id } : {}) }); turned.add(r); busy++; }
  }
  // 1. Mensagens para quem está trabalhando: caixa, a qualquer hora (até sob PAUSE: o agente está fechando o trabalho).
  for (const r of [...new Set(s.messages.map((m) => m.to))].sort()) {
    if (sess(r).state === 'working') out.push({ type: 'inbox', to: r, ids: pendingFor(r).map((m) => m.id) });
  }

  // 2. Tarefas do quadro, por prioridade. Um turno por papel por rodada; nunca para quem trabalha; nunca a mesma tarefa de novo.
  const stuartBusy = s.cards.some((c) => !c.blocked && (c.column === 'dev' || c.column === 'changes'));
  const tasks = [];
  for (const col of PRIORITY) {
    for (const c of s.cards.filter((x) => x.column === col && !x.blocked).sort((a, b) => a.n - b.n)) {
      for (const t of TASK_OF[col]) {
        if (col === 'devReady' && stuartBusy) continue;   // um card por vez para o Stuart
        if (col === 'review' && (c.reviewedBy || []).includes(t.role)) continue;   // já revisou este head
        tasks.push({ role: t.role, kind: t.kind, card: c, key: taskKey(c, t.kind) });
      }
    }
  }
  for (const t of tasks) {
    const se = sess(t.role);
    if (turned.has(t.role) || se.state === 'working' || se.task?.key === t.key) continue;
    if (frozen || busy >= s.maxConcurrent) continue;
    const ids = pendingFor(t.role).map((m) => m.id);
    out.push({ type: 'turn', to: t.role, how: se.state === 'idle' ? 'resume' : 'wake', ...(se.id ? { id: se.id } : {}), task: { key: t.key, kind: t.kind, n: t.card.n, ...(t.card.head ? { head: t.card.head } : {}) }, ids });
    turned.add(t.role); busy++;
  }

  // 3. Mensagens para quem não trabalha e não ganhou turno com tarefa.
  for (const r of [...new Set(s.messages.map((m) => m.to))].sort()) {
    const se = sess(r); if (se.state === 'working' || turned.has(r)) continue;
    const list = pendingFor(r), ids = list.map((m) => m.id), urgent = list.some((m) => m.urgent);
    const wantsTurn = se.state === 'idle' || s.offline === 'wake' || (s.offline === 'byUrgency' && urgent);
    if (!wantsTurn) { out.push({ type: 'hold', to: r, ids, why: 'desligado: entrega no próximo turno (SessionStart)' }); continue; }
    if (frozen) { out.push({ type: 'hold', to: r, ids, why: 'PAUSE ou orçamento' }); continue; }
    if (busy >= s.maxConcurrent) { out.push({ type: 'hold', to: r, ids, why: `maxConcurrent ${s.maxConcurrent}` }); continue; }
    out.push({ type: 'turn', to: r, how: se.state === 'idle' ? 'resume' : 'wake', ...(se.id ? { id: se.id } : {}), ids });
    turned.add(r); busy++;
  }

  // 4. Merge (D2) e juiz: 0 token, fora do maxConcurrent; o PAUSE segura os dois.
  if (!s.paused) {
    for (const c of s.cards.filter((x) => x.column === 'mergeReady' && !x.blocked).sort((a, b) => a.n - b.n)) out.push({ type: 'merge', n: c.pr ?? c.n });
    for (const d of s.deadlocks) if (!s.judged.includes(d.ref)) out.push({ type: 'judge', ref: d.ref });
  }
  return out;
}
export const COLUMN_KEYS = Object.keys(COLUMNS);
