// fsd-stages.mjs — as etapas do quadro (colunas do campo Status do Project). Único lugar com os nomes:
// os comandos usam a chave (STAGE.devReady) e o que vem da linha de comando ou do GitHub passa por stageName().
// Kanban: "Ready …" = fila que o papel pode puxar; "-ing" = alguém trabalhando. Sem efeitos colaterais
// (o fsd-board importa este módulo sem o fsd-lib).
// O nome da coluna leva o responsável entre parênteses ("Ready for Development (Stuart)"). Nome e responsável vêm da mesma
// linha da tabela, então não divergem. queue = fila de um papel: quem recebe o aviso quando um card chega (OWNERS).
const COLUMNS = {
  backlog: { base: 'Backlog', who: ['kevin'] },
  archReady: { base: 'Ready for Architecture', who: ['mel'], queue: true },
  arch: { base: 'Architecting', who: ['mel'] },
  devReady: { base: 'Ready for Development', who: ['stuart'], queue: true },
  dev: { base: 'Developing', who: ['stuart'] },
  review: { base: 'In Review', who: ['mel', 'bob'], queue: true },
  changes: { base: 'Changes Requested', who: ['stuart'] },
  mergeReady: { base: 'Ready to Merge', who: ['kevin'] },
  done: { base: 'Done', who: [] },
};
const cap = (a) => a[0].toUpperCase() + a.slice(1);
const full = (c) => (c.who.length ? `${c.base} (${c.who.map(cap).join(', ')})` : c.base);
export const STAGE = Object.fromEntries(Object.entries(COLUMNS).map(([k, c]) => [k, full(c)]));

// Dono de cada fila: quem é avisado quando um card chega nela (fora os avisos próprios de cada comando).
export const OWNERS = Object.fromEntries(Object.entries(COLUMNS).filter(([, c]) => c.queue).map(([k, c]) => [STAGE[k], c.who]));

// Responsáveis de cada etapa (inclusive as que não são fila): quem trabalha nela. O fsd-dev start usa para a regra de um card por vez.
export const WHO = Object.fromEntries(Object.entries(COLUMNS).map(([k, c]) => [STAGE[k], c.who]));

// Nomes antigos, aceitos por compatibilidade com handoffs e hábitos: os do kanban sem o responsável (até 2026-11-15) e os de antes
// do kanban (2026-11-08). Servem também enquanto o quadro do GitHub ainda não foi renomeado (fsd-board rename).
const LEGACY = {
  ...Object.fromEntries(Object.entries(COLUMNS).map(([k, c]) => [c.base.toLowerCase(), STAGE[k]])),
  'waiting for architecture': STAGE.archReady,
  'waiting for development': STAGE.devReady,
  'waiting for review': STAGE.review,
  review: STAGE.review,
  'waiting for release': STAGE.mergeReady,
};

// Chave (devReady), nome atual com ou sem o responsável (qualquer caixa) ou nome antigo → nome atual; desconhecido volta como veio.
export function stageName(x) {
  const s = String(x || '').trim(); const k = s.toLowerCase();
  if (STAGE[s]) return STAGE[s];
  const bare = k.replace(/\s*\([^)]*\)\s*$/, '');
  return Object.values(STAGE).find((n) => n.toLowerCase() === k) || LEGACY[bare] || s;
}
export const ownersOf = (name) => OWNERS[stageName(name)] || null;
