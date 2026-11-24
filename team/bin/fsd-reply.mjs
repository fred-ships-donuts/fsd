// fsd-pr reply (#184): a resposta a uma revisão sem commit novo. A decisão é pura: de um PR (JSON do gh) sai quem pediu mudança
// (a quem a revisão é pedida de novo) ou o motivo da recusa. Sem pedido de mudança aberto, não há o que responder.
import { reviewState } from './fsd-lib.mjs';

export function replyPlan(p) {
  if (!p || p.state !== 'OPEN') return { ok: false, error: `PR #${p?.number ?? '?'} não está aberto` };
  const who = reviewState(p).changes;
  if (!who.length) return { ok: false, error: `PR #${p.number} não tem mudança pedida: não há o que responder (commit novo: fsd-pr open)` };
  return { ok: true, reviewers: who };
}
