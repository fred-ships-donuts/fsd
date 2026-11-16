// fsd-context.mjs — a configuração de contexto dos agentes: a única leitura de agents.json → claude_common.context,
// com agents.<nome>.context por cima e, por último, o agents.local.json desta instalação. Sem valores padrão: campo faltando é erro de configuração, não um número escondido.
//   import { context } from './fsd-context.mjs'        context('stuart').restartAbove
//   node fsd-context.mjs <agente> <campo…>             um valor por linha (para os scripts bash), ex.: bands.normal.urgentAt
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REQUIRED = ['limit', 'outputReserve', 'urgentFree', 'mediumFree', 'restartAbove', 'marginPct', 'heavyFactor',
  'bands.normal.urgentAt', 'bands.normal.mediumAt', 'bands.heavy.urgentAt', 'bands.heavy.mediumAt'];
const get = (o, path) => path.split('.').reduce((v, k) => v?.[k], o);

// Ajuste desta instalação, fora do git: $FSD_STATE/agents.local.json, mesmos caminhos, por cima do agents.json.
function local() {
  const f = join(process.env.FSD_STATE || join(homedir(), '.config', 'fsd-agents'), 'agents.local.json');
  if (!existsSync(f)) return {};
  try { return JSON.parse(readFileSync(f, 'utf8')); } catch (e) { throw new Error(`agents.local.json inválido: ${e.message}`); }
}

export function context(agent = process.env.FSD_AGENT) {
  const cfg = JSON.parse(readFileSync(join(HERE, '..', 'agents.json'), 'utf8'));
  const loc = local();
  const c = { ...cfg.claude_common?.context, ...loc.claude_common?.context, ...cfg.agents?.[agent]?.context, ...loc.agents?.[agent]?.context };
  const missing = REQUIRED.filter((k) => !(Number(get(c, k)) > 0));
  if (missing.length) throw new Error(`agents.json → context sem ${missing.join(', ')}`);
  return c;
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [agent, ...keys] = process.argv.slice(2);
  try { const c = context(agent); for (const k of keys) console.log(get(c, k)); }
  catch (e) { console.error(`fsd-context: ${e.message}`); process.exit(2); }
}
