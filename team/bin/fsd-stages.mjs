// fsd-stages.mjs — as etapas do quadro (colunas do campo Status do Project). Único lugar com os nomes:
// os comandos usam a chave (STAGE.devReady) e o que vem da linha de comando passa por stageName().
// Kanban: "Ready …" = fila que o papel pode puxar; "-ing" = alguém trabalhando. Sem efeitos colaterais
// (o fsd-board importa este módulo sem o fsd-lib).
export const STAGE = {
  backlog: 'Backlog',
  archReady: 'Ready for Architecture',
  arch: 'Architecting',
  devReady: 'Ready for Development',
  dev: 'Developing',
  review: 'In Review',
  mergeReady: 'Ready to Merge',
  done: 'Done',
};

// Dono de cada fila: quem é avisado quando um card chega nela (fora os avisos próprios de cada comando).
export const OWNERS = { [STAGE.archReady]: ['mel'], [STAGE.devReady]: ['stuart'], [STAGE.review]: ['mel', 'bob'] };

// Nomes antigos (antes do kanban, 2026-11-08), aceitos por compatibilidade com handoffs e hábitos.
const LEGACY = {
  'waiting for architecture': STAGE.archReady,
  'waiting for development': STAGE.devReady,
  'waiting for review': STAGE.review,
  review: STAGE.review,
  'waiting for release': STAGE.mergeReady,
};

// Chave (devReady), nome atual (qualquer caixa) ou nome antigo → nome atual; desconhecido volta como veio.
export function stageName(x) {
  const s = String(x || '').trim(); const k = s.toLowerCase();
  if (STAGE[s]) return STAGE[s];
  return Object.values(STAGE).find((n) => n.toLowerCase() === k) || LEGACY[k] || s;
}
export const ownersOf = (name) => OWNERS[stageName(name)] || null;
