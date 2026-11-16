// fsd-context.mjs — a configuração de contexto dos agentes: a única leitura de agents.json → claude_common.context,
// com agents.<nome>.context por cima e, por cima de tudo, o agents.local.json desta instalação (mesma ordem, merge profundo). Sem valores padrão: campo faltando é erro de configuração, não um número escondido.
//   import { context } from './fsd-context.mjs'        context('stuart').restartAbove
//   node fsd-context.mjs <agente> <campo…>             um valor por linha (para os scripts bash), ex.: bands.normal.urgentAt
import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { localConfig, merge } from './fsd-local.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REQUIRED = ['limit', 'outputReserve', 'urgentFree', 'mediumFree', 'restartAbove', 'hardMarginTokens', 'marginPct', 'heavyFactor',
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

// ── Acima de restartAbove (#193): só o conjunto de fechamento passa. Uma lista, aqui. ──
// Bash: cada comando do encadeamento (&&, ||, ;, |) tem de começar por uma destas entradas (cd e VAR=x antes são ignorados).
const WRAP_BASH = [/^git(\s+-C\s+\S+)?\s+(add|commit|push|status|diff)(\s|$)/, /^fsd-pr\s+open(\s|$)/, /^fsd-review\s+post(\s|$)/, /^fsd-qa\s+finish(\s|$)/, /^fsd-restart(\s|$)/, /^fsd-notify(\s|$)/];
const WRAP_TOOLS = [/^mcp__ai-memory__memory_handoff_/];
export function wrapUpAllowed(tool, input = {}) {
  if (WRAP_TOOLS.some((r) => r.test(tool))) return true;
  if (tool !== 'Bash') return false;
  // O corpo de um heredoc não é comando: o que vem depois da linha com << é descartado. Aspas viram vazio (";" num título não separa).
  const lines = String(input.command || '').split('\n'); const cut = lines.findIndex((l) => l.includes('<<'));
  const text = (cut < 0 ? lines : lines.slice(0, cut + 1)).join('\n').replace(/'[^']*'|"[^"]*"/g, "''");
  if (/`|\$\(/.test(text)) return false;
  const parts = text.split(/&&|\|\||;|\||\n/).map((x) => x.replace(/<<.*$/, '').replace(/^\s*(\w+=\S*\s+)*/, '').trim()).filter(Boolean);
  return parts.length > 0 && parts.every((p) => /^cd\s+\S+$/.test(p) || WRAP_BASH.some((r) => r.test(p)));
}
export function wrapUpReason(used, above) { const k = (x) => `${Math.round(x / 1000)}k`; return `Contexto ${k(used)} > ${k(above)}. Pare: commit e push do que está pronto (WIP no branch, se for preciso) e rode fsd-restart AGORA. A sessão nova retoma do worktree.`; }

// Ação do vigia pelo contexto (#193). `ctx` do transcript. Devolve 'restart' ou null.
//   Monitor armado acima de restartAbove (sem trabalho): reinicia já. Trabalhando acima de restartAbove + hardMarginTokens: reinicia
//   no ponto seguro = entre duas ferramentas (nenhuma viva), sem diálogo, sem limite de uso, fora do shell.
export function contextAction({ ctx, above, hardMargin, working, monitor, tools = [], pane = '', paneCommand = '' }) {
  if (!ctx || ctx <= above) return null;
  if (!working) return monitor ? 'restart' : null;
  if (ctx <= above + hardMargin) return null;
  if (tools.length || ['bash', 'zsh', 'sh'].includes(String(paneCommand).trim())) return null;
  return /Do you want|❯ 1\.|Press Enter to continue|usage limit|hit your limit|limit will reset/i.test(pane) ? null : 'restart';
}

if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [agent, ...keys] = process.argv.slice(2);
  try { const c = context(agent); for (const k of keys) console.log(get(c, k)); }
  catch (e) { console.error(`fsd-context: ${e.message}`); process.exit(2); }
}
