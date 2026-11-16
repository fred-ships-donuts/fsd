// fsd-backlog.mjs — a fila do Kevin (#159): o Backlog é o trabalho essencial dele; o merge vem depois de cada item. Funções puras, sem gh.
//   parseBoardList(saída)   saída de `fsd-board list "<coluna>" -t` → [{ number, title, pr }]
//   kevinQueue({…})         as linhas da fila, na ordem: decision, Backlog, desbloqueados, PRs prontos para o merge
export const isStanding = (title) => /standing issue/i.test(String(title ?? ''));   // issue que nunca fecha (ex.: #147): não é trabalho

export function parseBoardList(out) {
  const m = String(out ?? '').match(/\((\d+)\):\s*(.*)/s);
  if (!m || !Number(m[1])) return [];
  return m[2].trim().split(' ; ').map((x) => x.trim().match(/^(PR)?#(\d+|-)\s*(.*)$/)).filter(Boolean)
    .map(([, pr, n, title]) => ({ number: n === '-' ? null : Number(n), title, pr: !!pr }));
}

const nums = (l) => l.map((n) => '#' + n).join(' ');

// decisions: números dos issues com a label decision · backlog: itens da coluna (parseBoardList) · blocked: números com a label blocked ·
// unblocked: linhas "desbloqueado: …" · ready: números dos PRs prontos e parados.
export function kevinQueue({ decisions = [], backlog = [], blocked = [], unblocked = [], ready = [] }) {
  const out = [];
  if (decisions.length) out.push(`decision: ${nums(decisions.slice(0, 3))}${decisions.length > 3 ? ` +${decisions.length - 3}` : ''} (fsd-issue decide)`);
  const cards = backlog.filter((x) => !x.pr && x.number != null);
  const fixed = cards.filter((x) => isStanding(x.title)).map((x) => x.number);
  const wait = cards.filter((x) => !fixed.includes(x.number) && blocked.includes(x.number)).map((x) => x.number);
  const work = cards.filter((x) => !fixed.includes(x.number) && !wait.includes(x.number)).map((x) => x.number);
  if (work.length || wait.length) out.push(`Backlog: ${work.length ? nums(work) : 'nada para mexer'}${wait.length ? ` (bloqueados, não é trabalho: ${nums(wait)})` : ''}${fixed.length ? ` (fixos: ${nums(fixed)})` : ''}`);
  out.push(...unblocked);
  if (ready.length) out.push(`prontos parados: ${nums(ready)}`);
  return out;
}
