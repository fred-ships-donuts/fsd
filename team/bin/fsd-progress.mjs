// fsd-progress.mjs — as regras puras do fsd-progress: o que parou no time. Sem efeitos colaterais ao importar; nada aqui lê arquivo,
// rede ou relógio (now e os limites entram por parâmetro). O CLI (fsd-progress) junta os dados, tira o que já foi dito e avisa o Kevin.
import { STAGE, WHO, stageName } from './fsd-stages.mjs';

const min = (ms) => Math.floor(ms / 60000);
const ms = (x) => (typeof x === 'number' ? x : Date.parse(x));
const base = (col) => col.replace(/\s*\([^)]*\)\s*$/, '');

// Trabalho aberto = coluna com dono, menos Backlog e Done.
export const isOpenColumn = (col) => { const c = stageName(col); return c !== STAGE.backlog && c !== STAGE.done && !!WHO[c]; };

// Quando o card se mexeu: o mais recente entre o item do quadro, o issue e o PR que o fecha (updatedAt e último commit).
// board: { column, number, updatedAt }[] · issues: { number, updatedAt, labels }[] · prs: { number, body, updatedAt, commits }[] · closes(body) → [n]
export function buildCards({ board, issues, prs, closes }) {
  const issueBy = new Map((issues || []).map((i) => [i.number, i]));
  const prsOf = (n) => (prs || []).filter((p) => closes(p.body || '').includes(n));
  const cards = [];
  for (const it of board || []) {
    const i = issueBy.get(it.number);
    if (!i || !it.column || !isOpenColumn(it.column)) continue;   // só issue aberto (o PR aparece pelo issue que fecha)
    const times = [it.updatedAt, i.updatedAt];
    for (const p of prsOf(i.number)) { times.push(p.updatedAt); const c = (p.commits || []).at(-1); if (c?.committedDate) times.push(c.committedDate); }
    const t = Math.max(...times.map(ms).filter(Number.isFinite));
    if (!Number.isFinite(t)) continue;
    cards.push({ n: i.number, column: it.column, movedAt: t, blocked: (i.labels || []).some((l) => (l.name ?? l) === 'blocked') });
  }
  return cards;
}

// No máximo um achado: o card aberto mais antigo parado há stallMin ou mais. cards: { n, column, movedAt, blocked }[].
export function findStalls({ cards, now, stallMin }) {
  const quiet = (cards || []).filter((c) => !c.blocked && isOpenColumn(c.column) && now - ms(c.movedAt) >= stallMin * 60000)
    .sort((a, b) => ms(a.movedAt) - ms(b.movedAt) || a.n - b.n);
  const c = quiet[0]; if (!c) return [];
  const col = stageName(c.column);
  return [{ key: `stall:#${c.n}`, sig: new Date(ms(c.movedAt)).toISOString(), line: `parado: #${c.n} em ${base(col)} há ${min(now - ms(c.movedAt))} min, dono: ${WHO[col].join('/')}` }];
}

export function findPause({ pauseAt, now, pauseMin, path = '$FSD_STATE/PAUSE' }) {
  if (pauseAt == null || now - ms(pauseAt) < pauseMin * 60000) return [];
  return [{ key: 'pause', sig: new Date(ms(pauseAt)).toISOString(), line: `PAUSE ligado há ${min(now - ms(pauseAt))} min (${path}); o arquivo fica, é do autor` }];
}

// inboxes: { agente: [{ t }] } → um achado por agente cujo aviso mais antigo tem inboxMin ou mais.
export function findOldNotices({ inboxes, now, inboxMin }) {
  const out = [];
  for (const [agent, list] of Object.entries(inboxes || {}).sort(([a], [b]) => a.localeCompare(b))) {
    const ts = (list || []).map((n) => ms(n.t)).filter(Number.isFinite);
    if (!ts.length) continue;
    const oldest = Math.min(...ts);
    if (now - oldest >= inboxMin * 60000) out.push({ key: `inbox:${agent}`, sig: new Date(oldest).toISOString(), line: `aviso parado há ${min(now - oldest)} min na caixa de ${agent} (${ts.length} na fila)` });
  }
  return out;
}
