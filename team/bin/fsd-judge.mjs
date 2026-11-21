// fsd-judge.mjs — a sessão do juiz (F1.7), sem E/S ao importar. O fsd-judge usa; os testes chamam direto.
//   judgeArgs({ stateDir })   argv do claude -p: só leitura, sem nenhuma regra de git (git log/show/diff --output escrevem
//                             arquivo, A7), --settings com deny de segredos, --json-schema com o contrato do judge-prompt.md
//   runSession(o)             roda a sessão; no prazo manda SIGINT, depois de graceMs SIGTERM e, por fim, SIGKILL
//   answerOf(stdout)          o objeto da resposta: structured_output (--json-schema), senão result, senão o texto
const str = { type: 'string', minLength: 1 };
const agent = { type: 'string', enum: ['mel', 'kevin', 'stuart', 'bob'] };
const obj = (properties) => ({ type: 'object', additionalProperties: false, required: Object.keys(properties), properties });
export const JUDGE_SCHEMA = obj({
  facts: { type: 'array', items: obj({ agent, asks: str, why: str, evidence: str }) },
  rule: obj({ owner: { type: 'string', enum: ['mel', 'kevin', 'author'] }, source: str, text: str }),
  verdict: obj({ continue: obj({ agent, instruction: str }), wait: { type: 'array', items: obj({ agent, reason: str }) } }),
  confidence: { type: 'string', enum: ['high', 'low'] },
  overrides_author: { type: 'boolean' },
  reserved: { type: 'boolean' },
});
// Leitura proibida: o estado do time (chaves dos Apps, tokens, caixas), credenciais do gh/ssh/claude e arquivos de segredo.
// As regras de Read valem também para Grep e Glob.
export function judgeSettings(stateDir) {
  const abs = (p) => `Read(/${p.replace(/\/+$/, '')}/**)`;   // "//caminho" = absoluto
  const deny = [abs(stateDir), 'Read(~/.config/fsd-agents/**)', 'Read(~/.config/gh/**)', 'Read(~/.ssh/**)', 'Read(~/.claude/**)', 'Read(~/.claude.json)',
    'Read(**/*.pem)', 'Read(**/*.key)', 'Read(**/.env)', 'Read(**/.env.*)', 'Read(**/*token*)', 'Read(**/*secret*)',
    'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch', 'Agent', 'Bash(git:*)', 'Bash(curl:*)', 'Bash(wget:*)', 'Bash(cat:*)', 'Bash(env:*)', 'Bash(printenv:*)'];
  return { permissions: { deny: [...new Set(deny)] }, disableAllHooks: true };
}
export const JUDGE_ALLOW = ['Read', 'Grep', 'Glob', 'Bash(gh pr view:*)', 'Bash(gh pr diff:*)', 'Bash(gh issue view:*)'];
export const JUDGE_DENY = ['Edit', 'Write', 'NotebookEdit', 'Agent', 'WebFetch', 'WebSearch'];
export function judgeArgs({ stateDir }) {
  return ['-p', '--model', 'sonnet', '--effort', 'medium', '--no-session-persistence', '--permission-mode', 'dontAsk',
    '--settings', JSON.stringify(judgeSettings(stateDir)), '--json-schema', JSON.stringify(JUDGE_SCHEMA), '--output-format', 'json',
    '--tools', 'Read,Grep,Glob,Bash', '--allowedTools', ...JUDGE_ALLOW, '--disallowedTools', ...JUDGE_DENY];
}
// O claude -p com --output-format json devolve { result, structured_output, is_error }. Erro do modelo → null.
export function answerOf(stdout) {
  const t = String(stdout || '').trim();
  try {
    const j = JSON.parse(t);
    if (j && typeof j === 'object' && ('structured_output' in j || 'result' in j || 'is_error' in j)) {
      if (j.is_error) return null;
      if (j.structured_output && typeof j.structured_output === 'object') return j.structured_output;
      return typeof j.result === 'string' ? j.result : null;
    }
  } catch {}
  return t;
}
// Prazo: SIGINT primeiro (o claude fecha a sessão), SIGTERM depois de graceMs, SIGKILL depois de mais graceMs.
import { spawn } from 'node:child_process';
export function runSession({ bin, args, input = '', cwd, env, timeoutMs, graceMs = 10000 }) {
  return new Promise((resolve) => {
    let out = ''; const signals = []; let timedOut = false; const timers = [];
    let p;
    try { p = spawn(bin, args, { cwd, env, stdio: ['pipe', 'pipe', 'ignore'] }); } catch (e) { resolve({ error: e, signals, timedOut, stdout: '' }); return; }
    const send = (sig) => { if (p.exitCode === null && p.signalCode === null) { signals.push(sig); try { p.kill(sig); } catch {} } };
    timers.push(setTimeout(() => { timedOut = true; send('SIGINT');
      timers.push(setTimeout(() => { send('SIGTERM'); timers.push(setTimeout(() => send('SIGKILL'), graceMs)); }, graceMs)); }, timeoutMs));
    p.stdout.on('data', (b) => { if (out.length < 64 << 20) out += b; });
    p.stdin.on('error', () => {}); p.stdin.end(input);
    p.on('error', (e) => { timers.forEach(clearTimeout); resolve({ error: e, signals, timedOut, stdout: out }); });
    p.on('close', (status, signal) => { timers.forEach(clearTimeout); resolve({ status, signal, signals, timedOut, stdout: out }); });
  });
}
