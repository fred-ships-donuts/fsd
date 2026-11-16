// fsd-redirects.mjs — "ação negada → comando do time". Sem efeitos colaterais ao importar (como o fsd-stages.mjs).
// Fonte única: team/redirects.json. Quem lê: o hook fsd-redirect-hook (redirect), o fsd-watch (authorAsks) e o bloco gerado
// em common/team.md (table, entre os marcadores). O hook só NEGA e nomeia o comando; nunca vira um allow.
//   redirect(command, ctx) → null | { id, command, reason }   command = null quando a entrada só avisa ({ say })
//   table() → a tabela Markdown            tokenize(command) → segmentos (um por comando simples)
//   ctx (tudo opcional): { agent, cwd, isMain(cwd), worktree(cwd), prOfBranch(cwd), issueOfBranch(cwd) }
// A linha de comando (fsd-redirects --test [arquivo] | --write | --check | --table) está em main().
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SOURCE = join(HERE, '..', 'redirects.json');
const TEAM_MD = join(HERE, '..', 'common', 'team.md');
const FIXTURES = join(HERE, '..', 'docs', 'redirect-fixtures.tsv');
export const START = '<!-- redirects:start -->';
export const END = '<!-- redirects:end -->';

export const load = (file = SOURCE) => JSON.parse(readFileSync(file, 'utf8'));

// ── Tokenização ──────────────────────────────────────────────────────────────
// Parte a linha em comandos simples (&&, ||, ;, |, &, quebra de linha, parênteses) fora de aspas. Um argumento entre aspas é um
// token só; o corpo de um heredoc é descartado; $(…) e crases dentro de aspas não são abertos. Casa por token, nunca por substring.
export function tokenize(command) {
  const s = String(command ?? ''); const segs = []; let toks = []; let cur = ''; let has = false; let q = null;
  const pending = []; // delimitadores de heredoc esperando o fim da linha
  const endTok = () => { if (has) toks.push(cur); cur = ''; has = false; };
  const endSeg = () => { endTok(); if (toks.length) segs.push(toks); toks = []; };
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q === "'") { if (c === "'") q = null; else cur += c; continue; }
    if (q === '"') {
      if (c === '"') q = null;
      else if (c === '\\' && i + 1 < s.length && '"\\$`'.includes(s[i + 1])) cur += s[++i];
      else cur += c;
      continue;
    }
    if (c === "'" || c === '"') { q = c; has = true; continue; }
    if (c === '\\') { if (i + 1 < s.length) { cur += s[++i]; has = true; } continue; }
    if (c === '<' && s[i + 1] === '<' && s[i + 2] !== '<') {
      let j = i + 2; if (s[j] === '-') j++; while (s[j] === ' ' || s[j] === '\t') j++;
      let w = ''; let qq = null;
      for (; j < s.length; j++) { const d = s[j]; if (qq) { if (d === qq) qq = null; else w += d; } else if (d === "'" || d === '"') qq = d; else if (/[\s;&|()<>]/.test(d)) break; else w += d; }
      if (w) { pending.push(w); endTok(); i = j - 1; continue; }
    }
    if (c === '\n') {
      endSeg();
      if (pending.length) {
        let rest = s.slice(i + 1);
        for (const d of pending.splice(0)) {
          const lines = rest.split('\n'); let k = 0;
          while (k < lines.length && lines[k].trim() !== d) k++;
          rest = lines.slice(k + 1).join('\n');
        }
        i = s.length - rest.length - 1;
      }
      continue;
    }
    if (c === ';' || c === '|' || c === '(' || c === ')') { endSeg(); continue; }
    if (c === '&') { if (s[i - 1] === '>' || s[i + 1] === '>') { cur += c; has = true; } else endSeg(); continue; }
    if (c === ' ' || c === '\t') { endTok(); continue; }
    cur += c; has = true;
  }
  endSeg();
  return segs;
}

const WRAPPERS = new Set(['rtk', 'sudo', 'time', 'command', 'exec', 'env', 'nohup', 'nice']);
const ENV = /^[A-Za-z_][A-Za-z0-9_]*=/;

// Tira o que vem antes do programa (VAR=x, rtk [bypass], sudo, time, env…) e o caminho do programa (/usr/bin/gh, ./git).
function peel(toks) {
  let t = toks.slice();
  for (;;) {
    if (!t.length) return t;
    if (ENV.test(t[0])) { t.shift(); continue; }
    if (WRAPPERS.has(basename(t[0]))) { const w = basename(t.shift()); if (w === 'rtk' && t[0] === 'bypass') t.shift(); while (t[0] && t[0].startsWith('-')) t.shift(); continue; }
    break;
  }
  if (t.length) t[0] = basename(t[0]);
  return t;
}

// Opções globais antes do subcomando: git -C <dir> / -c k=v / --no-pager…, gh -R <repo>. Devolve { args, cwd }.
function globals(program, args, cwd) {
  const a = args.slice(); let at = cwd, sock = false;
  for (;;) {
    const x = a[0];
    if (program === 'git' && x === '-C' && a.length > 1) { at = resolve(at, a[1]); a.splice(0, 2); continue; }
    if (program === 'git' && x === '-c' && a.length > 1) { a.splice(0, 2); continue; }
    if (program === 'git' && /^(--no-pager|--paginate|-P|--no-replace-objects|--literal-pathspecs)$/.test(x || '')) { a.shift(); continue; }
    if (program === 'git' && /^--(git-dir|work-tree|namespace)=/.test(x || '')) { a.shift(); continue; }
    if (program === 'tmux' && /^-([2CDluvVN]+|CC)$/.test(x || '')) { a.shift(); continue; }   // flags sem valor (-u, -2, -CC…): não são subcomando
    if (program === 'tmux' && /^-[fcT]$/.test(x || '') && a.length > 1) { a.splice(0, 2); continue; }   // -f/-c/-T <valor>: não é subcomando
    if (program === 'tmux' && /^-[LS]$/.test(x || '') && a.length > 1) { a.splice(0, 2); sock = true; continue; }   // -L/-S <socket>: sai o valor; fica a marca '-L' no fim (skipIfAny)
    if (program === 'gh' && /^(-R|--repo)$/.test(x || '') && a.length > 1) { a.splice(0, 2); continue; }
    return { args: sock ? a.concat('-L') : a, cwd: at };
  }
}

// ── Casamento ────────────────────────────────────────────────────────────────
const rx = (p) => new RegExp(p);
function matches(entry, program, args, ctx, cwd) {
  const m = entry.match; if (!m || m.program !== program) return null;
  const pos = args.filter((a) => !a.startsWith('-'));
  const words = m.words || [];
  for (let i = 0; i < words.length; i++) if (!new RegExp(`^(?:${words[i]})$`).test(pos[i] ?? '')) return null;
  if ((m.skipIfAny || []).some((p) => args.some((a) => rx(p).test(a)))) return null;
  let cap = null;
  if (m.argRegex) { cap = args.join(' ').match(rx(m.argRegex)); if (!cap) return null; }
  if (m.main && !(ctx.isMain ? ctx.isMain(cwd) : false)) return null;
  return { cap, pos: pos.slice(words.length) };
}

const fill = (text, vars) => text.replace(/<(worktree|n|title)>/g, (all, k) => vars[k] ?? all);

export function redirect(command, ctx = {}, config = load()) {
  let cwd = ctx.cwd || process.cwd(); const agent = ctx.agent || '';
  for (const raw of tokenize(command)) {
    const toks = peel(raw);
    if (!toks.length) continue;
    if (toks[0] === 'cd' || toks[0] === 'pushd') { if (toks[1]) cwd = resolve(cwd, toks[1]); continue; }
    const program = toks[0]; const g = globals(program, toks.slice(1), cwd);
    for (const e of config.redirects) {
      const hit = matches(e, program, g.args, ctx, g.cwd);
      if (!hit) continue;
      const vars = {};
      const wt = ctx.worktree?.(g.cwd); if (wt) vars.worktree = wt;
      let n = null;
      if (e.n === 'pr') n = hit.cap?.[1] ?? hit.pos.find((p) => /^\d+$/.test(p)) ?? ctx.prOfBranch?.(g.cwd) ?? null;
      if (e.n === 'issue') n = ctx.issueOfBranch?.(g.cwd) ?? null;
      if (n) vars.n = String(n).replace(/^#/, '');
      const d = e.do?.[agent] !== undefined ? e.do[agent] : e.do?.default;
      const say = d && typeof d === 'object' ? d.say : null; const cmd = typeof d === 'string' ? fill(d, vars) : null;
      const why = e.why ? `${e.why}` : 'this action is blocked for agents';
      const reason = cmd ? `Blocked: ${why}. Use: ${cmd}. Do not ask the author.` : `Blocked: ${why}. ${say ? fill(say, vars) + ' ' : ''}Do not ask the author.`;
      return { id: e.id, command: cmd, reason };
    }
  }
  return null;
}

// ── Tabela (bloco gerado em common/team.md) ──────────────────────────────────
const cell = (d) => {
  const one = (v) => (typeof v === 'string' ? `\`${v.replace(/\|/g, '\\|')}\`` : v?.say ? v.say.replace(/\|/g, '\\|') : '—');
  const { default: def, ...by } = d || {};
  const rest = Object.entries(by).map(([a, v]) => `${a}: ${one(v)}`);
  return [one(def), ...rest].join('<br>');
};
export function table(config = load()) {
  const rows = config.redirects.map((e) => `| ${e.label || e.id} | ${cell(e.do)} | ${(e.why || '').replace(/\|/g, '\\|')} |`);
  return ['| Ação negada | Comando do time | Por quê |', '| --- | --- | --- |', ...rows].join('\n');
}

const block = () => `${START}\n${table()}\n${END}`;
function readBlock(md) { const a = md.indexOf(START); const b = md.indexOf(END); return a < 0 || b < a ? null : [a, b + END.length]; }

// ── Fixtures: agente<TAB>cwd-kind<TAB>comando<TAB>esperado ───────────────────
// cwd-kind: main (pasta principal) | worktree. esperado: pass | blocked (nega sem comando) | o comando do time (worktree = /work/wt).
export function runFixtures(file = FIXTURES, config = load()) {
  const bad = []; let n = 0;
  for (const [i, line] of readFileSync(file, 'utf8').split('\n').entries()) {
    if (!line.trim() || line.startsWith('#')) continue;
    const [agent, kind, command, expected] = line.split('\t'); n++;
    if (!expected) { bad.push(`linha ${i + 1}: faltam colunas`); continue; }
    const r = redirect(command, { agent, cwd: '/work/wt', isMain: () => kind === 'main', worktree: () => '/work/wt' }, config);
    const got = !r ? 'pass' : r.command ?? 'blocked';
    if (got !== expected) bad.push(`linha ${i + 1}: ${agent} [${kind}] ${command}\n    esperado: ${expected}\n    obtido:   ${got}`);
  }
  return { n, bad };
}

export function main(argv) {
  const [flag, arg] = argv;
  if (flag === '--table') { console.log(table()); return 0; }
  if (flag === '--test') {
    const { n, bad } = runFixtures(arg || FIXTURES);
    if (bad.length) { console.log(`fsd-redirects: ${bad.length} de ${n} fixtures falharam\n${bad.join('\n')}`); return 1; }
    console.log(`fsd-redirects: ${n} fixtures ok`); return 0;
  }
  if (flag === '--write' || flag === '--check') {
    if (!existsSync(TEAM_MD)) { console.log(`fsd-redirects: ${TEAM_MD} não existe`); return 2; }
    const md = readFileSync(TEAM_MD, 'utf8'); const at = readBlock(md);
    if (!at) { console.log(`fsd-redirects: marcadores ${START} … ${END} não encontrados em common/team.md`); return 2; }
    const next = md.slice(0, at[0]) + block() + md.slice(at[1]);
    if (flag === '--check') {
      if (next !== md) { console.log('fsd-redirects: a tabela de common/team.md está velha: fsd-redirects --write'); return 1; }
      console.log('fsd-redirects: tabela de common/team.md em dia'); return 0;
    }
    if (next !== md) writeFileSync(TEAM_MD, next);
    console.log(next !== md ? 'fsd-redirects: tabela de common/team.md atualizada' : 'fsd-redirects: tabela de common/team.md já estava em dia'); return 0;
  }
  console.log('uso: fsd-redirects --test [arquivo] | --write | --check | --table'); return 2;
}
