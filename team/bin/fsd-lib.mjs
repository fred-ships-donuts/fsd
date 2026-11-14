// fsd-lib.mjs — código comum dos comandos fsd-* (agentes do fred-ships-donuts).
// Saídas curtas, uma linha quando possível. Códigos de saída: 0 ok · 1 regra não cumprida · 2 uso · 3 transitório · 4 GitHub/rede.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BIN = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(BIN, '..');
export const CFG = JSON.parse(readFileSync(join(ROOT, 'agents.json'), 'utf8'));
export const REPO = process.env.FSD_REPO_SLUG || CFG.board?.repo || 'fred-ships-donuts/fsd';
export const REPO_DIR = process.env.FSD_REPO || (process.env.HOME + '/fred-ships-donuts');
export const ME = process.env.FSD_AGENT || '';
export const AGENTS = Object.keys(CFG.agents);
export const today = () => new Date().toISOString().slice(0, 10);
export const REVIEWERS = CFG.reviewers || ['mel', 'bob'];
// Dono de cada coluna: quem é avisado quando um card chega nela (fora os avisos próprios de cada comando).
// Etapas do quadro e donos de cada fila: só em fsd-stages.mjs.
import { STAGE, OWNERS, stageName, ownersOf } from './fsd-stages.mjs';
export { STAGE, OWNERS, stageName, ownersOf };
const NAME = String(process.argv[1] || 'fsd').split('/').pop();
process.on('uncaughtException', (e) => { console.log(`${NAME}: ${String(e.message || e).split('\n')[0].slice(0, 200)}`); process.exit(e.code === 'ENOENT' ? 2 : (Number.isInteger(e.code) ? e.code : 4)); });
process.on('unhandledRejection', (e) => { console.log(`${NAME}: ${String(e?.message || e).split('\n')[0].slice(0, 200)}`); process.exit(4); });

export function die(msg, code = 1) { if (process.env.FSD_THROW) throw Object.assign(new Error(msg), { code }); console.log(msg); process.exit(code); }
export const firstLine = (s) => String(s || '').trim().split('\n').filter(Boolean).slice(-1)[0] || '';

// Roda um comando; em erro, sai com a última linha útil do stderr (sem dump).
export function run(cmd, args, { input, allowFail = false, cwd } = {}) {
  const r = spawnSync(cmd, args, { input, cwd, encoding: 'utf8', maxBuffer: 64 << 20, env: process.env, timeout: 90000, killSignal: 'SIGKILL' });
  if ((r.error || r.signal) && !allowFail) die(`${cmd} ${args[0] ?? ''}: sem resposta (${r.error?.code || r.signal}); tente de novo`, 3);
  if (r.status !== 0 && !allowFail) die(`${cmd} ${args[0] ?? ''} falhou: ${firstLine(r.stderr || r.stdout).slice(0, 200)}`, 4);
  return allowFail ? { ok: r.status === 0, out: (r.stdout || '').trim(), err: firstLine(r.stderr || r.stdout) } : (r.stdout || '').trim();
}
export const gh = (args, o) => run(join(BIN, 'gh'), args, o);
// Escrita no GitHub/quadro/avisos: com FSD_DRY=1 só imprime o que faria (para testes).
export const DRY = !!process.env.FSD_DRY;
export function write(cmd, args, o = {}) {
  if (DRY) { console.log(`[dry] ${cmd.split('/').pop()} ${args.map((x) => (/\s/.test(x) ? JSON.stringify(x) : x)).join(' ')}${o.input ? ` <<${JSON.stringify(o.input.slice(0, 120))}${o.input.length > 120 ? '…' : ''}` : ''}`); return o.allowFail ? { ok: true, out: '', err: '' } : 'https://github.com/x/y/issues/0'; }
  return run(cmd, args, o);
}
export const ghw = (args, o) => write(join(BIN, 'gh'), args, o);
export const ghJson = (args) => JSON.parse(gh(args) || 'null');
// Tamanho do issue pela label size:S|M|L (null sem label). A documentação escala por ele: S só o essencial, L a cadeia toda.
export const sizeOf = (i) => ((i.labels || []).map((l) => l.name).find((x) => /^size:[SML]$/.test(x)) || '').slice(5) || null;

// Logins: "app/fsd-kevin", "fsd-kevin[bot]" e "fsd-kevin" são a mesma pessoa.
export const norm = (l) => String(l || '').replace(/^app\//, '').replace(/\[bot\]$/, '');
export const meLogin = () => (ME ? `fsd-${ME}` : '');

// Issues fechados pelo PR (mesma regra do GitHub, aceita "Closes: #N").
export function closes(body) {
  const out = new Set();
  for (const m of String(body || '').matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?):?\s+#(\d+)/gi)) out.add(Number(m[1]));
  return [...out];
}

const PR_FIELDS = 'number,title,url,state,isDraft,baseRefName,headRefName,headRefOid,author,reviews,mergeable,body,mergeCommit';
export function pr(n) {
  const r = run(join(BIN, 'gh'), ['pr', 'view', String(n), '--json', PR_FIELDS], { allowFail: true });
  if (!r.ok) die(/not found|Could not resolve/i.test(r.err) ? `PR #${n} não encontrado` : `gh falhou: ${r.err.slice(0, 200)}`, /not found|Could not resolve/i.test(r.err) ? 1 : 4);
  return JSON.parse(r.out);
}
export const openPrs = () => ghJson(['pr', 'list', '--state', 'open', '--limit', '100', '--json', PR_FIELDS]);

// Revisões: a última decisiva de cada pessoa (APPROVED / CHANGES_REQUESTED / DISMISSED), em ordem cronológica.
export function reviewState(p) {
  const author = norm(p.author?.login);
  const last = new Map();
  for (const r of p.reviews || []) {
    if (!['APPROVED', 'CHANGES_REQUESTED', 'DISMISSED'].includes(r.state)) continue;
    last.set(norm(r.author?.login), r);
  }
  const approvers = [], stale = [], changes = [];
  for (const [who, r] of last) {
    if (who === author) continue;
    if (r.state === 'CHANGES_REQUESTED') changes.push(who);
    else if (r.state === 'APPROVED') (r.commit?.oid && r.commit.oid !== p.headRefOid ? stale : approvers).push(who);
  }
  return { author, approvers, stale, changes, last };
}
// Situação de um agente diante do PR: author | todo | ok | stale | changes
export function myStatus(p, login = meLogin()) {
  const { author, last } = reviewState(p);
  if (!login) return '-';
  if (author === login) return 'author';
  const r = last.get(login);
  if (!r || r.state === 'DISMISSED') return 'todo';
  if (r.state === 'CHANGES_REQUESTED') return r.commit?.oid === p.headRefOid ? 'changes' : 'todo';
  return r.commit?.oid && r.commit.oid !== p.headRefOid ? 'stale' : 'ok';
}

// Quadro e avisos: nunca derrubam o comando principal; devolvem um resumo curto.
export function board(col, nums, { quiet = true } = {}) {
  if (!nums.length) return '';
  col = stageName(col);
  const r = write(join(BIN, 'fsd-board'), ['move', col, ...nums.map(String), ...(quiet ? ['--quiet'] : [])], { allowFail: true });
  if (!r.ok && !quiet && ownersOf(col)) notify(ownersOf(col), `${nums.map((n) => '#' + n).join(',')} → ${col}`);
  return r.ok ? `${nums.map((n) => '#' + n).join(',')}→${col}` : `quadro não atualizado (${r.err.replace(/^fsd-board: /, '').slice(0, 80)})`;
}
export function notify(agents, text) {
  const to = [...new Set(agents.map((a) => a.replace(/^fsd-/, '')).filter((a) => AGENTS.includes(a) && a !== ME))];
  if (!to.length) return '';
  const r = write(join(BIN, 'fsd-notify'), [to.join(','), text], { allowFail: true });
  return r.out && r.out !== 'ninguém recebeu' ? `avisados: ${r.out}` : '';
}
export const agentOf = (login) => norm(login).replace(/^fsd-/, '');

// Seção de aceite de um issue: do título "Acceptance"/"Como verificar"/"aceite" até o próximo título de mesmo nível ou acima.
export function acceptance(body) {
  const lines = String(body || '').split('\n'); let on = false, lvl = 0; const out = [];
  for (const l of lines) {
    const h = l.match(/^(#+)\s/);
    if (h) { if (on && h[1].length <= lvl) break; if (!on && /acceptance|aceite|como verificar/i.test(l)) { on = true; lvl = h[1].length; continue; } }
    if (on) out.push(l);
  }
  const items = out.filter((l) => /^\s*(\d+\.|- \[[ xX]\]|[-*] )/.test(l)).map((l) => l.replace(/^\s*(\d+\.|- \[[ xX]\]|[-*])\s*/, '').trim());
  const fallback = items.length ? items : out.map((l) => l.trim()).filter((l) => l && !/^#/.test(l));
  return { found: on, items: fallback };
}
export function readArgFile(f) { if (!f || f.startsWith('--')) die('faltou o arquivo (ou - para ler da entrada padrão)', 2); return f === '-' ? readFileSync(0, 'utf8') : readFileSync(f, 'utf8'); }
export function state(file) { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } }
export function saveState(file, s) { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, JSON.stringify(s, null, 1)); }
export { existsSync };

// Depois de uma revisão: mudança pedida → Developing + avisa o autor; 2 aprovações atuais → Ready to Merge + avisa o autor.
export function afterReview(n) {
  const p = pr(n); const s = reviewState(p); const cl = closes(p.body); const author = agentOf(p.author?.login);
  if (s.changes.length) return [board(STAGE.dev, cl), notify([author], `PR #${n}: mudanças pedidas por ${s.changes.join(',')}. Veja a revisão.`)].filter(Boolean).join(' | ');
  if (s.approvers.length >= 2) return [board(STAGE.mergeReady, cl), notify([author], `PR #${n} tem 2 aprovações: rode fsd-merge ${n}.`)].filter(Boolean).join(' | ');
  return `aprovações ${s.approvers.length}/2`;
}

// PRs prontos para entrar: abertos, não draft, base develop, 2+ aprovações atuais, sem pedido de mudança, sem conflito.
export const ready = (p) => { const s = reviewState(p); return p.state === 'OPEN' && !p.isDraft && p.baseRefName === 'develop' && s.approvers.length >= 2 && !s.changes.length && p.mergeable !== 'CONFLICTING'; };
// Prontos "parados": de agentes (PR do autor só por número), com a 2ª aprovação há mais de FSD_READY_GRACE min (padrão 10).
// Assim o autor do PR mescla primeiro; --now ignora a espera.
export function readyIdle(p, now = process.argv.includes('--now')) {
  if (!ready(p) || !AGENTS.includes(agentOf(p.author?.login))) return false;
  if (now) return true;
  const s = reviewState(p); const t = s.approvers.map((w) => Date.parse(s.last.get(w)?.submittedAt || 0)).sort((x, y) => x - y)[1] || 0;
  return Date.now() - t > Number(process.env.FSD_READY_GRACE || 10) * 60000;
}
// PRs que um revisor (mel, bob) precisa olhar agora; os outros agentes não revisam por padrão.
export function todo(login) {
  const me = login.replace(/^fsd-/, ''); const rev = REVIEWERS.includes(me);
  if (!rev && me !== 'kevin') die(`só ${REVIEWERS.join(', ')} e kevin (PRs de revisores) revisam; ${login} não tem fila de revisão`, 2);
  return openPrs().filter((p) => !p.isDraft && p.baseRefName === 'develop' && (rev || REVIEWERS.includes(agentOf(p.author?.login))) && ['todo', 'stale'].includes(myStatus(p, login)));
}
export function issue(n) {
  const r = run(join(BIN, 'gh'), ['issue', 'view', String(n), '--json', 'number,title,body,state,labels,comments'], { allowFail: true });
  if (!r.ok) die(/not found|Could not resolve/i.test(r.err) ? `issue #${n} não encontrado` : `gh falhou: ${r.err.slice(0, 200)}`, /not found|Could not resolve/i.test(r.err) ? 1 : 4);
  return JSON.parse(r.out);
}
export const handoffOf = (i) => [...(i.comments || [])].reverse().find((c) => /^\*\*(Architect handoff|Arquiteto: passagem)\*\*/i.test(c.body.trim()));
export const clip = (t, max, chars = 2500) => { const l = String(t || '').trim().split('\n'); let o = l.length > max ? l.slice(0, max).join('\n') + `\n… +${l.length - max} linhas` : l.join('\n'); if (o.length > chars) o = o.slice(0, chars) + ` … (+${o.length - chars} caracteres; use --full)`; return o; };
