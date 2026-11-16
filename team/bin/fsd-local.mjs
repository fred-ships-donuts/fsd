// fsd-local.mjs — o ajuste desta instalação, fora do git: $FSD_STATE/agents.local.json, com os mesmos caminhos do
// agents.json, por cima dele. Uma leitura só para quem lê o agents.json (fsd-context, fsd-timing): a próxima seção que
// precisar de ajuste local usa o mesmo merge, sem reinventar.
//   import { localConfig, merge } from './fsd-local.mjs'     merge(agentsJson.timing, localConfig().timing)
import { existsSync, readFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Merge campo a campo, também dentro de objetos (bands.normal.urgentAt sozinho não apaga o resto de bands). Arrays e
// escalares substituem; b que não é objeto não muda nada.
export function merge(a, b) {
  if (!isObj(b)) return a;
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = isObj(v) && isObj(out[k]) ? merge(out[k], v) : v;
  return out;
}

// O conteúdo do agents.local.json ({} sem arquivo). JSON inválido é erro de configuração, com o nome do arquivo.
export function localConfig() {
  const f = join(process.env.FSD_STATE || join(homedir(), '.config', 'fsd-agents'), 'agents.local.json');
  if (!existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { throw new Error(`agents.local.json inválido: ${e.message}`); }
}
