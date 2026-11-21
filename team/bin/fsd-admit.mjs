// fsd-admit.mjs — entrada de issues do time (F3.5, T3.5.2; D8). Issue criado por agente fica com a label aguardando-autor e fora
// do quadro. Só a decisão do autor o libera: um comentário do autor que começa com "Decision (author, …)".
//   decision(text)               'aceitar' | 'recusar' | null (a decisão não diz)
//   admission(issues, { author }) → ações: { type: 'admit', n } (tira a label e põe no Backlog) · { type: 'close', n, reason }
// issues: [{ number, labels: [{ name }], comments: [{ author: { login }, body }] }]. A última decisão do autor vale.
export const HELD = 'aguardando-autor';
const norm = (l) => String(l || '').replace(/^app\//, '').replace(/\[bot\]$/, '').toLowerCase();
export function decision(text) {
  const m = /^\s*\**\s*Decision \(author\b[^)]*\)\s*\**\s*:?\s*([\s\S]*)$/i.exec(String(text || '')); if (!m) return null;
  const t = m[1].toLowerCase();
  const no = /\b(recus\w*|reject\w*|n[ãa]o\b|no\b|descart\w*|fecha\w*|close\w*)/.test(t), yes = /\b(aceit\w*|accept\w*|aprov\w*|approv\w*|sim\b|yes\b|ok\b|go\b|entra\b)/.test(t);
  return yes === no ? null : yes ? 'aceitar' : 'recusar';
}
export function admission(issues, { author }) {
  const out = [];
  for (const i of issues || []) {
    if (!(i.labels || []).some((l) => (l.name ?? l) === HELD)) continue;
    const mine = (i.comments || []).filter((c) => author && norm(c.author?.login) === norm(author)).map((c) => decision(c.body)).filter(Boolean);
    const d = mine.at(-1);
    if (d === 'aceitar') out.push({ type: 'admit', n: i.number });
    else if (d === 'recusar') out.push({ type: 'close', n: i.number, reason: 'not planned' });
  }
  return out;
}
