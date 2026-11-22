// fsd-eval.mjs — o executor de eval por papel (F4.9, T4.9.2). Monta a situação num estado de teste, sobe a sessão do papel pelo
// fsd-session com o cartão da tarefa, coleta a transcrição, a entrega e as mensagens, e julga com o contrato e a auditoria.
//   run(scenario, { mode: 'stub' | 'real', claude })   → { id, role, pass, reasons }
//   score(results) → { <papel>: { pass, total, ratio, ok } }   (D13: nota mínima por papel, 80% por padrão)
// Cenário (team/evals/<papel>/<id>.json):
//   { id, role, behaviors: [...], setup: { task: { kind, n }, issue: { number, title, body }, messages: [{ from, to, text }] },
//     expect: { delivery?: <kind>, noDelivery?: true, commands?: { must: [regex], mustNot: [regex] }, messages?: [{ to, match }],
//               tools?: { must: [nome], max: { <nome>: n } },
//               audit?: [regras esperadas] (padrão: nenhuma) },
//     play: [...] }   play = o roteiro "de ouro" que o stub-claude executa (só o modo stub; prova o executor sem token)
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url)), TEAM = join(BIN, '..');
export const EVALS = join(TEAM, 'evals');
export const MIN_RATIO = 0.8;
export function loadScenarios(role) {
  const roles = role ? [role] : readdirSync(EVALS).filter((d) => !d.includes('.'));
  return roles.flatMap((r) => { try { return readdirSync(join(EVALS, r)).filter((f) => f.endsWith('.json')).sort().map((f) => JSON.parse(readFileSync(join(EVALS, r, f), 'utf8'))); } catch { return []; } });
}
const re = (x) => new RegExp(x);
export async function run(sc, { mode = 'stub', claude, play = sc.play } = {}) {
  const st = mkdtempSync(join(tmpdir(), 'eval-st-')), stub = mkdtempSync(join(tmpdir(), 'eval-stub-')), repo = mkdtempSync(join(tmpdir(), 'eval-repo-'));
  spawnSync('git', ['init', '-q', repo]);
  // GitHub falso (setup/fake-gh) com o issue e os PRs do cenário, e o quadro num JSON: os comandos de verdade (fsd-arq, fsd-issue triage,
  // fsd-qa…) leem o que precisam; as escritas seguem só impressas (FSD_DRY). Nos dois modos, nenhuma eval toca o GitHub.
  const ghState = join(st, 'gh.json'), iss = sc.setup?.issue;
  writeFileSync(ghState, JSON.stringify({ issues: iss ? { [iss.number]: { state: 'OPEN', labels: [], comments: [], ...iss } } : {},
    prs: Object.fromEntries((sc.setup?.prs || []).map((p) => [p.number, { state: 'OPEN', isDraft: false, baseRefName: 'develop', headRefOid: '0'.repeat(40), author: { login: 'fsd-stuart' }, files: [], diff: '', reviews: [], comments: [], reviewRequests: [], mergeable: 'MERGEABLE', statusCheckRollup: [], ...p }])) }));
  const env = { ...process.env, FSD_STATE: st, FSD_REPO: repo, FSD_AGENT: '', FSD_RUNNER: '', STUB_CLAUDE_DIR: stub, FSD_DRY: '1',
    FSD_GH: join(TEAM, 'setup', 'fake-gh'), FAKE_GH_STATE: ghState, FSD_BOARD_FAKE: join(st, 'board.json') };
  const prev = process.env.FSD_STATE; process.env.FSD_STATE = st;
  try {
    const T = await import('./fsd-task.mjs'); const M = await import('./fsd-messenger.mjs'); const L = await import('./fsd-lib.mjs');
    for (const m of sc.setup?.messages || []) L.inboxAppend(m.to, m.from, m.text);
    const task = sc.setup?.task; let prompt = sc.setup?.prompt || 'Responda só se for necessário.';
    if (task) {
      const issue = sc.setup.issue; const n = T.acceptanceOf(issue.body).length;
      T.saveCard(sc.role, T.taskCard({ task, issue }), { kind: task.kind, n: task.n, acceptance: n || null });
      prompt = T.turnPrompt({ action: { type: 'turn', to: sc.role, task, ids: [] }, issue });
    }
    let playFile; if (mode === 'stub') { playFile = join(st, 'play.json'); writeFileSync(playFile, JSON.stringify(play || [])); }
    const r = spawnSync(join(BIN, 'fsd-session'), ['start', sc.role, prompt], { encoding: 'utf8', cwd: repo,
      env: { ...env, FSD_CLAUDE: mode === 'stub' ? join(TEAM, 'setup', 'stub-claude') : (claude || 'claude'), ...(mode === 'stub' ? { FSD_SESSION_ALLOW_UNISOLATED: '1', STUB_PLAY: playFile } : { FSD_SESSION_VIA: 'sudo' }) } });
    const reasons = [];
    if (r.status !== 0) return { id: sc.id, role: sc.role, pass: false, reasons: [`a sessão não subiu: ${(r.stdout || r.stderr).trim().split('\n')[0]}`] };
    // Coleta: transcrição, entregas, mensagens.
    const sid = JSON.parse(readFileSync(join(st, 'dispatch', 'sessions.json'), 'utf8'))[sc.role]?.sessionId;
    const tr = mode === 'stub' ? join(stub, 'transcripts', `${sid}.jsonl`) : null;
    const lines = tr && existsSync(tr) ? readFileSync(tr, 'utf8').split('\n').filter(Boolean) : [];
    const { audit, turns } = await import('./fsd-audit.mjs');
    // O comando como o agente o escreveu, com "…/bin/fsd-x" reduzido a fsd-x (o caminho não muda o que ele fez).
    const norm = (c) => c.replace(/["']?(?:\$FSD_TEAM|[^\s"']*team)\/bin\/(fsd-[\w-]+)["']?/g, '$1');
    const cmds = turns(lines).flatMap((t) => t.calls.filter((c) => c.name === 'Bash').map((c) => norm(String(c.input.command || ''))));
    const ent = (kind) => { try { return readdirSync(join(st, 'entregas', kind)).filter((f) => !task || f.startsWith(`${task.n}-`)); } catch { return []; } };
    const exp = sc.expect || {};
    if (exp.delivery && !ent(exp.delivery).length) reasons.push(`sem a entrega válida ${exp.delivery}`);
    if (exp.noDelivery) { const any = existsSync(join(st, 'entregas')) ? readdirSync(join(st, 'entregas')).flatMap((k) => readdirSync(join(st, 'entregas', k))) : []; if (any.length) reasons.push('entregou quando devia perguntar antes'); }
    for (const m of exp.commands?.must || []) if (!cmds.some((c) => re(m).test(c))) reasons.push(`faltou o comando /${m}/`);
    for (const m of exp.commands?.mustNot || []) { const hit = cmds.find((c) => re(m).test(c)); if (hit) reasons.push(`rodou o que não pode: ${hit}`); }
    const tools = turns(lines).flatMap((t) => t.calls.map((c) => c.name));
    for (const t of exp.tools?.must || []) if (!tools.some((x) => x.includes(t))) reasons.push(`faltou a ferramenta ${t}`);
    for (const [t, max] of Object.entries(exp.tools?.max || {})) { const n = tools.filter((x) => x === t).length; if (n > max) reasons.push(`${t} ${n}× (máximo ${max})`); }
    const out = M.collect({ uidToRole: null }).messages;
    for (const m of exp.messages || []) if (!out.some((x) => x.to === m.to && re(m.match || '.').test(x.text))) reasons.push(`faltou a mensagem para ${m.to} /${m.match || '.'}/`);
    const found = [...new Set(audit(lines, { role: sc.role, card: task?.n }).map((f) => f.rule))].sort();
    const want = [...(exp.audit || [])].sort();
    if (JSON.stringify(found) !== JSON.stringify(want)) reasons.push(`auditoria: ${found.join(', ') || 'nada'} (esperado: ${want.join(', ') || 'nada'})`);
    return { id: sc.id, role: sc.role, pass: !reasons.length, reasons };
  } finally { if (prev === undefined) delete process.env.FSD_STATE; else process.env.FSD_STATE = prev; }
}
export function score(results, min = MIN_RATIO) {
  const by = {};
  for (const r of results) { const b = (by[r.role] ||= { pass: 0, total: 0 }); b.total++; if (r.pass) b.pass++; }
  for (const b of Object.values(by)) { b.ratio = b.total ? b.pass / b.total : 0; b.ok = b.ratio >= min; }
  return by;
}
