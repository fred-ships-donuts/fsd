// fsd-verify-hook.mjs — verificação depois de cada edição do Stuart na sessão nova (F4.7): um hook PostToolUse, 0 token. Depois de
// Edit/Write/MultiEdit num arquivo de código, roda o tsc do worktree (sem emitir), o node --check dos .mjs/.js e o teste do arquivo (ele
// mesmo, se for teste, ou o irmão <nome>.test.<ext>). Erro → { decision: "block", reason } no stdout: o claude mostra o erro ao agente na
// hora, antes da próxima ferramenta. Passou → nada. Só com FSD_RUNNER=session.
//   plan(filePath, { exists }) → { root, steps: [{ name, cmd, args }] } | null    (puro; o executor roda)
//   verify(input, { run, exists }) → '' | JSON
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, basename, extname, relative } from 'node:path';

const CODE = /\.(ts|tsx|mts|cts|mjs|js)$/;
const EDIT_TOOLS = new Set(['Edit', 'Write', 'MultiEdit']);
const rootOf = (f, exists) => { let d = dirname(f); for (;;) { if (exists(join(d, 'package.json'))) return d; const up = dirname(d); if (up === d) return null; d = up; } };
export function plan(file, { exists = existsSync } = {}) {
  if (!CODE.test(file || '')) return null;
  const root = rootOf(file, exists); if (!root) return null;
  const ext = extname(file), ts = /\.(ts|tsx|mts|cts)$/.test(ext), isTest = /\.test\.[cm]?[tj]sx?$/.test(file);
  const steps = [];
  const tsc = join(root, 'node_modules', '.bin', 'tsc');
  if (ts && exists(tsc)) {
    const cfg = isTest && exists(join(root, 'tsconfig.test.json')) ? 'tsconfig.test.json' : 'tsconfig.json';
    if (exists(join(root, cfg))) steps.push({ name: `tsc -p ${cfg}`, cmd: tsc, args: ['--noEmit', '-p', join(root, cfg)] });
  }
  if (!ts) steps.push({ name: 'node --check', cmd: process.execPath, args: ['--check', file] });
  const sib = join(dirname(file), `${basename(file, ext)}.test${ext}`);
  const test = isTest ? file : exists(sib) ? sib : null;
  if (test) steps.push({ name: `teste ${relative(root, test)}`, cmd: process.execPath, args: [...(ts ? ['--import', 'tsx'] : []), '--test', test] });
  return { root, steps };
}
const defaultRun = (s, root) => { const r = spawnSync(s.cmd, s.args, { cwd: root, encoding: 'utf8', timeout: 120000, env: { ...process.env, FSD_RUNNER: '' } }); return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}${r.error ? r.error.message : ''}` }; };
// Do teste, só o que diz o que falhou (o TAP inteiro estoura o contexto).
const brief = (name, out) => {
  const l = out.split('\n').filter((x) => x.trim());
  const keep = /^teste /.test(name) ? l.filter((x) => /not ok|Error|error:|expected|actual|\+ |- |at .*\.(ts|mjs|js):\d+/.test(x)) : l;
  return (keep.length ? keep : l).slice(0, 30).join('\n');
};
export function verify(input, { run = defaultRun, exists = existsSync } = {}) {
  if (!EDIT_TOOLS.has(input?.tool_name)) return '';
  const p = plan(input?.tool_input?.file_path, { exists }); if (!p || !p.steps.length) return '';
  const bad = [];
  for (const s of p.steps) { const r = run(s, p.root); if (!r.ok) bad.push(`## ${s.name}\n${brief(s.name, r.out)}`); }
  if (!bad.length) return '';
  return JSON.stringify({ decision: 'block', reason: `Verificação depois da edição de ${relative(p.root, input.tool_input.file_path)} falhou (corrija antes de seguir):\n\n${bad.join('\n\n')}` });
}
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.env.FSD_RUNNER !== 'session') process.exit(0);
  let raw = ''; process.stdin.on('data', (d) => { raw += d; }).on('end', () => {
    let input = null; try { input = JSON.parse(raw); } catch { process.exit(0); }
    const out = verify(input); if (out) process.stdout.write(out + '\n'); process.exit(0);
  });
}
