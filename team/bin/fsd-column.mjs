// fsd-column.mjs — a coluna de um card com PR, calculada em um só lugar (#187, S3 de #181). Puro: sem E/S ao importar.
//   cardColumn(p, { pulled })   nome de STAGE, ou null se o card fica onde está (fechado sem merge, draft)
//   prFromGraphQL(node) · prFromGh(json)   a mesma forma normalizada:
//     { state, isDraft, headRefOid, mergeable, author, reviews: [{ author, state, commit }], reviewRequests: [login], checks, body }
//   PR_GRAPHQL   a consulta de todos os PRs abertos (o S4 #188 a reutiliza)
import { STAGE, reviewState, norm } from './fsd-lib.mjs';

// Regras, nesta ordem: MERGED → Done · CLOSED/draft → null · mudança pendente ou conflito → Developing (pulled) ou Changes Requested ·
// 2 aprovações no head + MERGEABLE + checks verdes (ou sem checks) → Ready to Merge · senão In Review.
// Mudança pendente = CHANGES_REQUESTED decisivo no head cujo revisor não foi pedido de novo (o pedido de nova revisão limpa; um push novo também).
export function cardColumn(p, { pulled = false } = {}) {
  if (p.state === 'MERGED') return STAGE.done;
  if (p.state === 'CLOSED' || p.isDraft) return null;
  const gh = { author: { login: p.author }, headRefOid: p.headRefOid, reviews: (p.reviews || []).map((r) => ({ author: { login: r.author }, state: r.state, commit: { oid: r.commit } })) };
  const s = reviewState(gh);
  const asked = new Set((p.reviewRequests || []).map(norm));
  const pending = s.changes.some((who) => s.last.get(who)?.commit?.oid === p.headRefOid && !asked.has(who));
  if (pending || p.mergeable === 'CONFLICTING') return pulled ? STAGE.dev : STAGE.changes;
  if (s.approvers.length >= 2 && p.mergeable === 'MERGEABLE' && ['SUCCESS', 'NONE'].includes(p.checks)) return STAGE.mergeReady;
  return STAGE.review;
}

const FAIL = new Set(['FAILURE', 'ERROR', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE']);
const WAIT = new Set(['PENDING', 'EXPECTED', 'QUEUED', 'IN_PROGRESS', 'WAITING', 'REQUESTED']);
// statusCheckRollup do gh (lista) → SUCCESS | FAILURE | PENDING | NONE.
function rollupOfList(list) {
  if (!Array.isArray(list) || !list.length) return 'NONE';
  const v = list.map((c) => String(c.conclusion || c.state || c.status || '').toUpperCase());
  if (v.some((x) => FAIL.has(x))) return 'FAILURE';
  if (v.some((x) => WAIT.has(x) || x === '')) return 'PENDING';
  return 'SUCCESS';
}
// statusCheckRollup.state do GraphQL (texto) → o mesmo conjunto.
function rollupOfState(st) {
  const x = String(st || '').toUpperCase();
  if (!x) return 'NONE';
  if (FAIL.has(x)) return 'FAILURE';
  return WAIT.has(x) ? 'PENDING' : 'SUCCESS';
}
const MERGEABLE = (m) => (m === 'MERGEABLE' || m === 'CONFLICTING' ? m : 'UNKNOWN');

export function prFromGraphQL(n) {
  return {
    state: n.state, isDraft: !!n.isDraft, headRefOid: n.headRefOid, mergeable: MERGEABLE(n.mergeable), author: n.author?.login || '', body: n.body || '',
    reviews: (n.reviews?.nodes || []).map((r) => ({ author: r.author?.login, state: r.state, commit: r.commit?.oid })),
    reviewRequests: (n.reviewRequests?.nodes || []).map((x) => x.requestedReviewer?.login).filter(Boolean),
    checks: rollupOfState(n.commits?.nodes?.[0]?.commit?.statusCheckRollup?.state),
  };
}
export function prFromGh(j) {
  return {
    state: j.state, isDraft: !!j.isDraft, headRefOid: j.headRefOid, mergeable: MERGEABLE(j.mergeable), author: j.author?.login || '', body: j.body || '',
    reviews: (j.reviews || []).map((r) => ({ author: r.author?.login, state: r.state, commit: r.commit?.oid })),
    reviewRequests: (j.reviewRequests || []).map((x) => x.login).filter(Boolean),
    checks: rollupOfList(j.statusCheckRollup),
  };
}

export const PR_GRAPHQL = `query($owner:String!,$name:String!){repository(owner:$owner,name:$name){pullRequests(states:OPEN,first:100){nodes{number state isDraft headRefOid mergeable body author{login} reviews(last:50){nodes{author{login} state commit{oid}}} reviewRequests(first:20){nodes{requestedReviewer{... on User{login}}}} commits(last:1){nodes{commit{statusCheckRollup{state}}}} projectItems(first:5){nodes{fieldValueByName(name:"Status"){... on ProjectV2ItemFieldSingleSelectValue{name}}}}}}}}`;
