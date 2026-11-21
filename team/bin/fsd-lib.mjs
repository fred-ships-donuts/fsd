// fsd-lib.mjs — código comum dos comandos fsd-* (agentes do fred-ships-donuts).
// Saídas curtas, uma linha quando possível. Códigos de saída: 0 ok · 1 regra não cumprida · 2 uso · 3 transitório · 4 GitHub/rede.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync, renameSync, readdirSync, unlinkSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const BIN = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(BIN, '..');
export const CFG = JSON.parse(readFileSync(join(ROOT, 'agents.json'), 'utf8'));
export const REPO = process.env.FSD_REPO_SLUG || CFG.board?.repo || 'fred-ships-donuts/fsd';
// Tipos de branch (<tipo>/<n>-<slug> com tarefa, <tipo>/<slug> sem): os mesmos tipos de commit do commitlint, mais feature.
export const BRANCH_TYPES = ['feature', 'feat', 'fix', 'docs', 'chore', 'refactor', 'test', 'perf', 'build', 'ci', 'style', 'revert'];
export const REPO_DIR = process.env.FSD_REPO || join(BIN, '..', '..'); // o clone em que team/bin/ mora
export const ME = process.env.FSD_AGENT || '';
export const AGENTS = Object.keys(CFG.agents);
export const today = () => new Date().toISOString().slice(0, 10);
export const REVIEWERS = CFG.reviewers || ['mel', 'bob'];
// Dono de cada coluna: quem é avisado quando um card chega nela (fora os avisos próprios de cada comando).
// Etapas do quadro e donos de cada fila: só em fsd-stages.mjs.
import { STAGE, OWNERS, WHO, stageName, ownersOf } from './fsd-stages.mjs';
import { timing } from './fsd-timing.mjs';
import { cardColumn, prFromGh } from './fsd-column.mjs';
export { STAGE, OWNERS, WHO, stageName, ownersOf };
export { cardColumn, prFromGraphQL, prFromGh, PR_GRAPHQL } from './fsd-column.mjs';
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

const PR_FIELDS = 'number,title,url,state,isDraft,baseRefName,headRefName,headRefOid,author,reviews,mergeable,body,mergeCommit,reviewRequests,statusCheckRollup';
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
// Aviso: devolve { delivered, queued } (quem recebeu na sessão, quem ficou na caixa do inbox). Use noticeSummary(r) para imprimir.
export function notify(agents, text) {
  const res = { delivered: [], queued: [] };
  const to = [...new Set(agents.map((a) => a.replace(/^fsd-/, '')).filter((a) => AGENTS.includes(a) && a !== ME))];
  if (!to.length) return res;
  // Dry run (FSD_DRY) não entrega nem enfileira nada: passa por write(), que só imprime. Chamado direto, o fsd-notify trata o FSD_DRY sozinho.
  const r = (DRY ? write : run)(join(BIN, 'fsd-notify'), [to.join(','), text], { allowFail: true });
  for (const l of r.out.split('\n')) {
    const d = l.match(/^delivered: (.+)$/); const q = l.match(/^(\S+) did not receive: queued$/);
    if (d) res.delivered.push(...d[1].split(',')); else if (q) res.queued.push(q[1]);
  }
  return res;
}
export const noticeSummary = (r) => [r.delivered.length ? `avisados: ${r.delivered.join(',')}` : '', r.queued.length ? `na fila: ${r.queued.join(',')}` : ''].filter(Boolean).join(' | ');
// Caixa de avisos não entregues: $FSD_STATE/inbox/<agente>, uma linha JSON por aviso. Só nomes de agents.json viram caminho.
export const inboxDir = () => join(process.env.FSD_STATE || join(process.env.HOME || '', '.config', 'fsd-agents'), 'inbox');
export const inboxValid = (a) => typeof a === 'string' && /^[a-z0-9_-]+$/.test(a) && AGENTS.includes(a);
const inboxFile = (a) => { if (!inboxValid(a)) throw new Error(`unknown agent: ${a}`); return join(inboxDir(), a); };
export function inboxAppend(agent, from, text) {
  const f = inboxFile(agent); mkdirSync(inboxDir(), { recursive: true });
  appendFileSync(f, JSON.stringify({ t: new Date().toISOString(), from, text }) + '\n');
}
// Esvazia por rename: um aviso que chega durante a leitura cai num arquivo novo, sem perda nem leitura dupla.
export function inboxDrain(agent) {
  const f = inboxFile(agent); const tmp = `${f}.${process.pid}`;
  try { renameSync(f, tmp); } catch { return []; }
  let raw = ''; try { raw = readFileSync(tmp, 'utf8'); } catch {}
  try { unlinkSync(tmp); } catch {}
  const out = [];
  for (const l of raw.split('\n')) { if (!l.trim()) continue; try { const n = JSON.parse(l); if (n && typeof n.text === 'string') out.push({ t: String(n.t || ''), from: String(n.from || '?'), text: n.text }); } catch {} }
  return out;
}
export function inboxCount(agent) {
  try { return readFileSync(inboxFile(agent), 'utf8').split('\n').filter((l) => l.trim()).length; } catch { return 0; }
}
export const noticeLine = (n) => `[${n.t.slice(0, 16).replace('T', ' ')}] ${n.from}: ${n.text}`;
// Registro de esperas ($FSD_STATE/waits/<agente>.json): quem espera por quem. Só os agentes de agents.json viram nome de arquivo.
export const stateDir = () => process.env.FSD_STATE || join(process.env.HOME || '', '.config', 'fsd-agents');
export const waitsDir = () => join(stateDir(), 'waits');
const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
// Lista as esperas vivas; apaga as de mais de timing.waits.expireMin, as de processo morto e as ilegíveis.
export function waitsList() {
  let names = []; try { names = readdirSync(waitsDir()).filter((f) => f.endsWith('.json')); } catch { return []; }
  const out = [];
  for (const f of names) {
    const path = join(waitsDir(), f); const agent = f.slice(0, -5); let w = null;
    try { w = JSON.parse(readFileSync(path, 'utf8')); } catch {}
    const ok = w && AGENTS.includes(agent) && Number.isInteger(w.pid) && Date.parse(w.since) > Date.now() - Number(timing().waits.expireMin) * 60000 && pidAlive(w.pid);
    if (!ok) { try { unlinkSync(path); } catch {} continue; }
    out.push({ agent, for: w.for, what: w.what, ref: w.ref ?? null, since: w.since });
  }
  return out;
}
// Detector de impasse (#91). Relógio: FSD_NOW (ms ou data ISO) faz o tempo "simulado" dos testes; sem ele, Date.now().
export const clock = () => { const v = process.env.FSD_NOW; if (v) { const n = /^\d+$/.test(v) ? Number(v) : Date.parse(v); if (Number.isFinite(n)) return n; } return Date.now(); };
// Última atividade de um PR/issue (ms): updated_at move com comentário, revisão, label e push. Mover o card no quadro NÃO conta: aceito, sem consultar o quadro.
export const activityOf = (ref) => Date.parse(ghJson(['api', `repos/${REPO}/issues/${String(ref).replace(/^#/, '')}`]).updated_at);
// Pura: sem arquivo, rede nem Date.now(); tudo entra por parâmetro. activityOf só é chamada para candidatos, no máximo uma vez por ref.
// DEADLOCK: ciclo de esperas no mesmo ref, quieto há cycleMin. STALLED: ref sem ciclo em que todos esperam e nada se mexe há stallMin.
export function findDeadlocks(waits, { now, activityOf: act, cycleMin, stallMin }) {
  const groups = new Map();
  for (const w of waits) if (w.ref) { if (!groups.has(w.ref)) groups.set(w.ref, []); groups.get(w.ref).push(w); }
  const t = (w) => Date.parse(w.since); const out = []; const quiet = {};
  const activity = (ref) => (ref in quiet ? quiet[ref] : (quiet[ref] = act(ref)));
  const sigOf = (ws) => ws.map((w) => `${w.agent}>${w.for}@${w.since}`).sort().join(',');
  for (const [ref, ws] of [...groups].sort((a, b) => a[0].localeCompare(b[0], 'en', { numeric: true }))) {
    const by = new Map(ws.map((w) => [w.agent, w])); const seen = new Set(); const cycles = [];
    for (const a of [...by.keys()].sort()) {
      if (seen.has(a)) continue;
      const path = []; let cur = a;
      while (cur && by.has(cur) && !path.includes(cur) && !seen.has(cur)) { path.push(cur); cur = by.get(cur).for; }
      path.forEach((x) => seen.add(x));
      if (cur && path.includes(cur)) cycles.push(path.slice(path.indexOf(cur)));
    }
    if (cycles.length) {
      for (const c of cycles) {
        const i = c.indexOf([...c].sort()[0]); const cyc = [...c.slice(i), ...c.slice(0, i)]; const cw = cyc.map((a) => by.get(a));
        const newest = Math.max(...cw.map(t));
        if (!(now - newest >= cycleMin * 60000)) continue;
        if (!(now - Math.max(activity(ref), newest) >= cycleMin * 60000)) continue;
        const chain = [...cyc, cyc[0]].join('→');
        out.push({ kind: 'DEADLOCK', ref, line: `DEADLOCK ${ref}: ${chain}`, sig: sigOf(cw), key: cycles.length > 1 ? `DEADLOCK ${ref} ${chain}` : `DEADLOCK ${ref}` });
      }
    } else if (ws.every((w) => now - t(w) >= stallMin * 60000) && now - activity(ref) >= stallMin * 60000) {
      const sorted = [...ws].sort((a, b) => a.agent.localeCompare(b.agent));
      out.push({ kind: 'STALLED', ref, line: `STALLED ${ref}: ${sorted.map((w) => `${w.agent}→${w.for} "${w.what}"`).join('; ')}`, sig: sigOf(ws), key: `STALLED ${ref}` });
    }
  }
  return out;
}
// Memória persistida ($FSD_STATE/<arquivo>.json = { chave: sig }): o fsd-wait sai a cada evento, então a memória não pode ficar no processo.
// Devolve só o que é novo ou mudou; guarda o que está presente e esquece o que sumiu (o mesmo achado formado de novo vale de novo).
// Só o Kevin grava (persist = ME === 'kevin'): quem não é o Kevin lê sem consumir, para o aviso do Kevin não se perder. O fsd-progress,
// que roda pelo vigia, passa persist: true.
export function seenNew(name, findings, all = false, persist = ME === 'kevin') {
  const file = join(stateDir(), name); let seen = {};
  try { seen = JSON.parse(readFileSync(file, 'utf8')) || {}; } catch {}
  const next = Object.fromEntries(findings.map((f) => [f.key, f.sig]));
  if (persist && JSON.stringify(next) !== JSON.stringify(seen)) {
    try { mkdirSync(dirname(file), { recursive: true }); const tmp = `${file}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(next)); renameSync(tmp, file); } catch {}
  }
  return all ? findings : findings.filter((f) => seen[f.key] !== f.sig);
}
export const deadlocksNew = (findings, all = false) => seenNew('deadlocks.json', findings, all);

// Cards com a label `blocked` cujo bloqueio acabou. O bloqueio vem do ÚLTIMO comentário que começa com "Blocked by #<m>[, #<k>]: <o que destrava>";
// com todos os #<m> fora de OPEN (fechados, ou PR mesclado/fechado) o card entra: { key, sig, line }. Bloqueio ainda aberto, ou card sem esse comentário,
// não entra. Uma chamada ao GitHub por card bloqueado (a lista só custa uma). O script nunca tira a label: é do Kevin.
export function unblocked() {
  const out = [];
  for (const i of ghJson(['issue', 'list', '--label', 'blocked', '--state', 'open', '--json', 'number', '--limit', '100']) || []) {
    const last = [...(ghJson(['issue', 'view', String(i.number), '--json', 'comments'])?.comments || [])].reverse().find((c) => /^\s*Blocked by\b/i.test(c.body));
    const head = last ? last.body.trim().split('\n')[0].replace(/^Blocked by\b/i, '').split(':')[0] : '';
    const refs = [...new Set((head.match(/#(\d+)/g) || []).map((x) => Number(x.slice(1))))].filter((m) => m !== i.number);
    if (!refs.length || refs.some((m) => ghJson(['issue', 'view', String(m), '--json', 'state'])?.state === 'OPEN')) continue;
    out.push({ key: `#${i.number}`, sig: refs.join(','), line: `desbloqueado: #${i.number} (${refs.map((m) => '#' + m).join(', ')} fechado)` });
  }
  return out;
}
export const unblockedNew = (findings, all = false) => seenNew('blocked.json', findings, all);
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

// Cards de uma coluna do quadro: [números]. Quadro fora do ar ou não configurado: [] (quem chama decide se isso basta).
export function columnCards(col) {
  const r = run(join(BIN, 'fsd-board'), ['list', stageName(col)], { allowFail: true });
  const m = r.ok && r.out.match(/\((\d+)\):\s*(.*)/);
  return m ? (m[2].match(/(?<![A-Za-z])#(\d+)/g) || []).map((x) => Number(x.slice(1))) : [];
}
// Os cards do desenvolvedor em andamento: Changes Requested e Developing (nessa ordem), com a coluna de cada um. Espera por revisão não conta.
export function devCards() {
  return [STAGE.changes, STAGE.dev].flatMap((col) => columnCards(col).map((n) => ({ n, col })));
}
// Move o card de um PR para a coluna que cardColumn calcula (#187); null (fechado, draft) deixa o card onde está. `p` é o JSON do gh (L.pr).
export function boardPr(p, { pulled = false, state } = {}) {
  const n = prFromGh(p); if (state) n.state = state;
  const col = cardColumn(n, { pulled }); return col ? board(col, closes(p.body)) : '';
}
// CI obrigatório (#152): os jobs do workflow regression.yml. 'green' só com todos presentes e SUCCESS; 'red' se algum falhou;
// 'pending' se falta job ou algum não terminou (inclui "ainda sem checks").
export const REQUIRED_CI = ['build', 'test', 'paths', 'shellcheck'];
const CI_BAD = ['FAILURE', 'CANCELLED', 'TIMED_OUT', 'ACTION_REQUIRED', 'STARTUP_FAILURE', 'ERROR'];
export function ciState(p) {
  const by = new Map((p.statusCheckRollup || []).filter((c) => c.workflowName === 'regression').map((c) => [c.name, c]));
  const res = REQUIRED_CI.map((k) => by.get(k));
  if (res.some((c) => c && CI_BAD.includes(c.conclusion))) return 'red';
  return res.every((c) => c && c.status === 'COMPLETED' && c.conclusion === 'SUCCESS') ? 'green' : 'pending';
}
// 2 aprovações e CI verde → Ready to Merge (Kevin) + avisa o autor.
export function promote(p) {
  const n = p.number; const cl = closes(p.body); const author = agentOf(p.author?.login);
  return [board(STAGE.mergeReady, cl), noticeSummary(notify([author], `PR #${n} tem 2 aprovações e CI verde: rode fsd-merge ${n}.`))].filter(Boolean).join(' | ');
}
// CI que ficou verde depois das 2 aprovações: leva o card para Ready to Merge. Devolve os PRs promovidos.
export function promoteGreen(prs) {
  const have = new Set(columnCards(STAGE.mergeReady));
  const out = [];
  for (const p of prs) { const cl = closes(p.body); if (!ready(p) || (cl.length && cl.every((c) => have.has(c)))) continue; promote(p); out.push(p.number); }
  return out;
}
// Depois de uma revisão: mudança pedida → Changes Requested (Stuart) + avisa o autor (e, se ele está em outro card, manda terminar o commit,
// devolver o card novo para Ready for Development e ir para a correção); 2 aprovações atuais → Ready to Merge (Kevin) + avisa o autor.
// A decisão pura de afterReview (sem gh nem avisos): 'changes' | 'promote' | 'hold-ci' (2 aprovações, CI não verde) | 'count'.
export function reviewOutcome(p) {
  const s = reviewState(p);
  if (s.changes.length) return 'changes';
  if (s.approvers.length >= 2) return ciState(p) === 'green' ? 'promote' : 'hold-ci';
  return 'count';
}
export function afterReview(n) {
  const p = pr(n); const s = reviewState(p); const cl = closes(p.body); const author = agentOf(p.author?.login); const col = cardColumn(prFromGh(p));
  if (reviewOutcome(p) === 'changes') {
    const other = devCards().filter((c) => !cl.includes(c.n) && c.col === STAGE.dev);
    const rework = other.length ? ` Você está em ${other.map((c) => '#' + c.n).join(', ')} (${STAGE.dev}): termine o commit atual, devolva o card com fsd-board move "${STAGE.devReady}" ${other.map((c) => c.n).join(' ')} (mantenha o worktree) e vá para a correção.` : '';
    return [board(col, cl), noticeSummary(notify([author], `PR #${n}: mudanças pedidas por ${s.changes.join(',') || 'conflito'}. Veja a revisão.${rework}`))].filter(Boolean).join(' | ');
  }
  if (s.approvers.length >= 2) {
    const ci = ciState(p);
    if (reviewOutcome(p) === 'hold-ci') return [`2 aprovações, CI ${ci}: o card fica onde está`, noticeSummary(notify([author], `PR #${n} tem 2 aprovações, mas o CI da regressão está ${ci}: o card só vai para ${STAGE.mergeReady} com o CI verde.`))].filter(Boolean).join(' | ');
    return promote(p);
  }
  return `aprovações ${s.approvers.length}/2`;
}

// Portão de merge, decisão pura: as razões que impedem o merge (vazio = pode entrar) e se o GitHub ainda calcula o conflito.
// Exige 2 aprovações atuais, nenhum pedido de mudança, base develop, sem conflito e o CI da regressão verde: vermelho ou
// pendente recusa (o ruleset da develop também exige os jobs, este portão só recusa antes de chamar o GitHub).
export function mergeGate(p) {
  const s = reviewState(p); const fail = [];
  if (p.state !== 'OPEN') fail.push(`estado ${p.state}`);
  if (p.isDraft) fail.push('draft');
  if (p.baseRefName !== 'develop') fail.push(`base ${p.baseRefName} (só develop; a main é do autor)`);
  if (p.mergeable === 'CONFLICTING') fail.push('conflito com a develop');
  if (s.approvers.length < 2) fail.push(`${s.approvers.length}/2 aprovações atuais${s.stale.length ? ` (antigas: ${s.stale.join(',')})` : ''}`);
  if (s.changes.length) fail.push(`mudanças pedidas por ${s.changes.join(',')}`);
  const ci = ciState(p);
  if (ci !== 'green') fail.push(`CI da regressão ${ci === 'red' ? 'vermelho' : 'pendente'} (${REQUIRED_CI.join(', ')})`);
  return { fail, approvers: s.approvers, calculating: p.mergeable === 'UNKNOWN' };
}
// PRs prontos para entrar: abertos, não draft, base develop, 2+ aprovações atuais, sem pedido de mudança, sem conflito, CI verde.
export const ready = (p) => { const s = reviewState(p); return p.state === 'OPEN' && !p.isDraft && p.baseRefName === 'develop' && s.approvers.length >= 2 && !s.changes.length && p.mergeable !== 'CONFLICTING' && ciState(p) === 'green'; };
// Prontos "parados": de agentes (PR do autor só por número), com a 2ª aprovação há mais de agents.json → timing.readyGraceMin
// (FSD_READY_GRACE passa por cima).
// Assim o autor do PR mescla primeiro; --now ignora a espera.
export function readyIdle(p, now = process.argv.includes('--now')) {
  if (!ready(p) || !AGENTS.includes(agentOf(p.author?.login))) return false;
  if (now) return true;
  const s = reviewState(p); const t = s.approvers.map((w) => Date.parse(s.last.get(w)?.submittedAt || 0)).sort((x, y) => x - y)[1] || 0;
  return Date.now() - t > Number(timing().readyGraceMin) * 60000;
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
