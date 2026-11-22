// handoff-sections.mjs — as seções que a passagem precisa pelo tamanho e as que faltam num texto (a mesma regra do fsd-arq publish).
//   node handoff-sections.mjs <S|M|L> <arquivo|->   → "ok" ou "faltam: …" (exit 1); size:S → "sem passagem" (exit 1)
import { readFileSync } from 'node:fs';
export const NEED = { L: ['What to do', 'Files', 'Contracts', 'Risks', 'Out of scope', 'Verification'], M: ['What to do', 'Files', 'Verification'] };
export function missing(size, text) {
  if (size === 'S') return null;
  return (NEED[size] || []).filter((h) => !new RegExp(`\\*\\*${h}:?\\*\\*`, 'i').test(String(text || '')));
}
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const [size, f] = process.argv.slice(2); if (!/^[SML]$/.test(size || '') || !f) { console.log('uso: handoff-sections.mjs <S|M|L> <arquivo|->'); process.exit(2); }
  const m = missing(size, readFileSync(f === '-' ? 0 : f, 'utf8'));
  if (m === null) { console.log('size:S não tem passagem'); process.exit(1); }
  console.log(m.length ? `faltam: ${m.join(', ')}` : 'ok'); process.exit(m.length ? 1 : 0);
}
