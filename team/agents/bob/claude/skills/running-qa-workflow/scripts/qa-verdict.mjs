// qa-verdict.mjs — o veredito do QA a partir dos itens (o mesmo que o fsd-qa finish publica): pass só com todo item pass; falta de
// item é erro. Serve para conferir a entrega qa antes do finish.  node qa-verdict.mjs <entrega.json> → "pass" | "fail" | erro (exit 1)
import { realpathSync } from 'node:fs';
import { readFileSync } from 'node:fs';
export function verdict(items, total) {
  const byItem = new Map(items.map((x) => [x.item, x.result]));
  const miss = Array.from({ length: total }, (_, k) => k + 1).filter((k) => !byItem.has(k));
  if (miss.length) return { error: `itens sem resultado: ${miss.join(',')}` };
  return { verdict: [...byItem.values()].every((r) => r === 'pass') ? 'pass' : 'fail' };
}
import { fileURLToPath } from 'node:url';
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const d = JSON.parse(readFileSync(process.argv[2], 'utf8')); const r = verdict(d.acceptance || [], (d.acceptance || []).length);
  if (r.error) { console.log(r.error); process.exit(1); }
  console.log(r.verdict); process.exit(d.verdict && d.verdict !== r.verdict ? 1 : 0);
}
