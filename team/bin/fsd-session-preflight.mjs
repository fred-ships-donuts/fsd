// fsd-session-preflight.mjs — antes de subir a sessão de um papel (F4.1, T4.1.3): recusa sem os hooks do time, sem o ai-memory, sem
// login ou com o túnel do ai-memory fechado. Cada falha vem com o motivo. 0 token: lê arquivos, `claude auth status` e uma porta.
//   requiredHooks · hooksMissing(settingsFiles) · check({ settingsFiles, claude, home, probe }) → [motivos]
import { readFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { connect } from 'node:net';

// O que a sessão nova precisa: caixa e cartão (fsd-session-hook), fim de turno e contrato (Stop), guard de contexto, ai-memory.
export const requiredHooks = { PostToolUse: ['fsd-session-hook', 'fsd-context-guard'], UserPromptSubmit: ['fsd-session-hook'], SessionStart: ['fsd-session-hook'], Stop: ['fsd-session-hook'] };
const cmds = (files) => {
  const out = {};
  for (const f of files) { let j = null; try { j = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
    for (const [ev, list] of Object.entries(j.hooks || {})) for (const x of list) for (const h of x.hooks || []) (out[ev] ||= []).push(String(h.command || '')); }
  return out;
};
export function hooksMissing(files) {
  const have = cmds(files); const miss = [];
  for (const [ev, names] of Object.entries(requiredHooks)) for (const n of names) if (!(have[ev] || []).some((c) => c.includes(n))) miss.push(`${ev}: ${n}`);
  if (!Object.values(have).flat().some((c) => /ai-memory/.test(c))) miss.push('ai-memory: nenhum hook');
  return miss;
}
// O binário e a porta do ai-memory saem do próprio comando do hook.
export function aiMemoryOf(files, home) {
  const c = Object.values(cmds(files)).flat().find((x) => /ai-memory/.test(x)); if (!c) return null;
  const bin = c.split(/\s+/)[0].replace(/^\$HOME|^~/, home); const port = Number(/--server-url\s+\S*:(\d+)/.exec(c)?.[1] || 0);
  return { bin, port };
}
export const portOpen = (port, host = '127.0.0.1', ms = 1500) => new Promise((res) => { const s = connect({ port, host }); const t = setTimeout(() => { s.destroy(); res(false); }, ms); s.on('connect', () => { clearTimeout(t); s.end(); res(true); }); s.on('error', () => { clearTimeout(t); res(false); }); });
export async function check({ settingsFiles, claude = 'claude', home = process.env.HOME, probe = portOpen }) {
  const why = [];
  for (const m of hooksMissing(settingsFiles)) why.push(`hook faltando (${m})`);
  const aim = aiMemoryOf(settingsFiles, home);
  if (aim && !existsSync(aim.bin)) why.push(`ai-memory não instalado (${aim.bin})`);
  if (aim?.port && !(await probe(aim.port))) why.push(`túnel do ai-memory fechado (127.0.0.1:${aim.port})`);
  let auth = null; try { auth = JSON.parse(spawnSync(claude, ['auth', 'status'], { encoding: 'utf8', timeout: 20000 }).stdout || 'null'); } catch {}
  if (!auth?.loggedIn) why.push('claude sem login (claude auth status: loggedIn false)');
  return why;
}
// CLI (o wrapper fsd-session-exec chama como o papel): node fsd-session-preflight.mjs <settings…> → motivos; exit 1 se houver.
import { fileURLToPath } from 'node:url';
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const why = await check({ settingsFiles: process.argv.slice(2), claude: process.env.FSD_PREFLIGHT_CLAUDE || 'claude' });
  if (why.length) { console.log(`a sessão não sobe:\n${why.map((w) => `- ${w}`).join('\n')}`); process.exit(1); }
}
