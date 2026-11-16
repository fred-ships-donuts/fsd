// fsd-context.mjs — a configuração de contexto dos agentes: a única leitura de agents.json → claude_common.context,
// com agents.<nome>.context por cima e, por cima de tudo, o agents.local.json desta instalação (mesma ordem, merge profundo). Sem valores padrão: campo faltando é erro de configuração, não um número escondido.
//   import { context } from './fsd-context.mjs'        context('stuart').restartAbove
//   node fsd-context.mjs <agente> <campo…>             um valor por linha (para os scripts bash), ex.: bands.normal.urgentAt
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localConfig, merge } from './fsd-local.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REQUIRED = ['limit', 'outputReserve', 'urgentFree', 'mediumFree', 'restartAbove', 'marginPct', 'heavyFactor',
  'bands.normal.urgentAt', 'bands.normal.mediumAt', 'bands.heavy.urgentAt', 'bands.heavy.mediumAt'];
const get = (o, path) => path.split('.').reduce((v, k) => v?.[k], o);
export function context(agent = process.env.FSD_AGENT) {
  const cfg = JSON.parse(readFileSync(join(HERE, '..', 'agents.json'), 'utf8'));
  const loc = localConfig();
  // Ordem: agents.json (comum, depois o agente) e, por cima de tudo, o local (comum, depois o agente). Merge campo a
  // campo, também dentro de objetos (bands.normal.urgentAt sozinho não apaga o resto de bands).
  const c = [cfg.claude_common?.context, cfg.agents?.[agent]?.context, loc.claude_common?.context, loc.agents?.[agent]?.context]
    .reduce((acc, o) => merge(acc, o), {});
  const missing = REQUIRED.filter((k) => !(Number(get(c, k)) > 0));
  if (missing.length) throw new Error(`agents.json/agents.local.json → context sem ${missing.join(', ')}`);
  return c;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [agent, ...keys] = process.argv.slice(2);
  try { const c = context(agent); for (const k of keys) console.log(get(c, k)); }
  catch (e) { console.error(`fsd-context: ${e.message}`); process.exit(2); }
}
