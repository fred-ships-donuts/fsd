// fsd-native-guard.mjs — o guard PreToolUse da sessão nova (F4.2, T4.2.2). O deny do Claude Code casa o comando como foi escrito;
// aqui o comando é aberto nos contornos conhecidos e cada pedaço passa pelo mesmo deny do papel:
//   bash/sh/zsh -c '…' · eval … · $(…) e `…` · env [-i] [VAR=…] cmd · VAR=… cmd · prefixos (timeout N, nohup, nice, command,
//   exec, time, stdbuf, xargs) · variáveis atribuídas na mesma linha (X=git; $X push --force)
//   Monitor, ListAgents e SendMessage: sempre negados.
//   unwrap(cmd) → [pedaços] · rulesFor(role) → regras Bash(...) · decide({ tool_name, tool_input }, rules) → null | motivo
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deniedBy } from './fsd-audit.mjs';

const TEAM = join(dirname(fileURLToPath(import.meta.url)), '..');
export const BLOCKED_TOOLS = ['Monitor', 'ListAgents', 'SendMessage'];
const PREFIX = /^(?:timeout(?:\s+-\S+)*\s+\S+|nohup|nice(?:\s+-n\s*\S+)?|command|builtin|exec|time|stdbuf(?:\s+-\S+)*|xargs(?:\s+-\S+)*)\s+/;
const segments = (cmd) => String(cmd).split(/&&|\|\||;|\||\n/).map((s) => s.trim()).filter(Boolean);
const unquote = (x) => { const t = x.trim(); return (t.startsWith("'") && t.endsWith("'")) || (t.startsWith('"') && t.endsWith('"')) ? t.slice(1, -1) : t; };
export function unwrap(cmd, depth = 0) {
  if (depth > 5) return [String(cmd)];
  const out = new Set([String(cmd).trim()]);
  const vars = {}; for (const m of String(cmd).matchAll(/(?:^|[;&|\s])([A-Za-z_][A-Za-z0-9_]*)=("[^"]*"|'[^']*'|[^\s;&|]+)/g)) vars[m[1]] = unquote(m[2]);
  const expand = (s) => s.replace(/\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?/g, (all, v) => (v in vars ? vars[v] : all));
  const subs = [...String(cmd).matchAll(/\$\(([^()]*)\)|`([^`]*)`/g)].map((m) => m[1] ?? m[2]);
  for (const sub of subs) for (const x of unwrap(sub, depth + 1)) out.add(x);
  for (let seg of segments(cmd)) {
    seg = expand(seg);
    for (let i = 0; i < 6; i++) {   // tira camadas: VAR=…, env, prefixos
      const before = seg;
      seg = seg.replace(/^(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S+)\s+)+/, '');
      seg = seg.replace(/^env(?:\s+-i|\s+-u\s+\S+|\s+[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S+))*\s+/, '');
      seg = seg.replace(PREFIX, '');
      if (seg === before) break;
    }
    out.add(seg);
    const c = /^(?:bash|sh|zsh|dash)(?:\s+-[A-Za-z]+)*?\s+-[A-Za-z]*c[A-Za-z]*\s+([\s\S]+)$/.exec(seg) || /^eval\s+([\s\S]+)$/.exec(seg);   // -c, -lc, -ec…
    if (c) for (const x of unwrap(unquote(c[1]), depth + 1)) out.add(x);
  }
  return [...out].filter(Boolean);
}
const bashRules = (files) => files.flatMap((f) => { try { return (JSON.parse(readFileSync(f, 'utf8')).permissions?.deny || []).map((r) => /^Bash\((.*)\)$/.exec(r)?.[1]).filter(Boolean); } catch { return []; } });
// O perfil do root (no container), ou, fora dele, a soma do que o fsd-users junta.
export function rulesFor(role) {
  const prof = `/etc/fsd/profiles/${role}/settings.json`;
  if (existsSync(prof)) return bashRules([prof]);
  return bashRules([join(TEAM, 'claude-settings.json'), join(TEAM, 'agents', role, 'claude', 'settings.json'), join(TEAM, 'agents', role, 'claude', 'settings.session.json')]);
}
// F2.5: o fsd-qa do Bob roda fora do sandbox do Bash (sandbox.excludedCommands; o sudo para o fsd-run não roda com no_new_privs). Para a
// exceção não virar porta, um comando que cita o fsd-qa só passa sozinho: `fsd-qa <sub> <args>` sem operador de shell nenhum. Validação
// R21: sem heredoc (uma linha do corpo igual ao terminador fecha a entrada e o resto vira comando fora do sandbox); o item com mais de
// um comando vai num arquivo, `fsd-qa run <k> --file <f>`, e o corpo vai para o fsd-run (outro usuário, ambiente limpo).
const QA = /(^|[\s;&|(`/])fsd-qa(\s|$)/;
const SHELL_OPS = /[;&|`<>\n]|\$\(/;
export function qaAlone(cmd) {
  const c = String(cmd).trim();
  if (!QA.test(c)) return true;
  return /^(?:\S*\/)?fsd-qa\s+(prep|run|key|verdict|finish|bug|clean)(\s|$)/.test(c) && !SHELL_OPS.test(c);
}
export function decide(input, rules) {
  if (BLOCKED_TOOLS.includes(input.tool_name)) return `${input.tool_name} não existe na sessão do time nativo: fale com o colega por fsd-diga; o supervisor acorda quem precisa.`;
  if (input.tool_name !== 'Bash') return null;
  const cmd = String(input.tool_input?.command || '');
  if (!qaAlone(cmd)) return 'negado: o fsd-qa roda fora do sandbox e só passa sozinho na linha (sem ;, &&, |, $( ), redireção nem outro comando). Item com mais de um comando: escreva-o num arquivo (Write) e rode fsd-qa run <k> --file <arquivo>.';
  for (const piece of unwrap(cmd)) { const r = deniedBy(piece, rules); if (r) return `negado: "${piece.slice(0, 120)}" casa com Bash(${r})${piece !== cmd.trim() ? ' (dentro de um contorno)' : ''}. Se o comando for necessário, abra um issue para o autor liberar por PR.`; }
  return null;
}
