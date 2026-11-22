// fsd-session-preflight.mjs — antes de subir a sessão de um papel (F4.1, T4.1.3): recusa sem os hooks do time, sem o ai-memory, sem
// login, sem o token do ai-memory em arquivo ou com o túnel do ai-memory fechado. Cada falha vem com o motivo. 0 token: lê arquivos, `claude auth status` e uma porta.
//   requiredHooks · hooksMissing(settingsFiles) · check({ settingsFiles, claude, home, probe }) → [motivos]
import { realpathSync } from 'node:fs';
import { readFileSync, existsSync, accessSync, constants } from 'node:fs';
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
  // T2.5.2: sem --auth-token no comando, o hook autentica pelo <data_dir>/auth-token (o argv é legível por todos os uids).
  const dataDir = (/--data-dir\s+(\S+)/.exec(c)?.[1] || '$HOME/.local/share/ai-memory').replace(/^\$HOME|^~/, home);
  return { bin, port, tokenFile: /--auth-token\b/.test(c) ? null : `${dataDir}/auth-token` };
}
const readable = (f) => { try { return readFileSync(f, 'utf8').trim() !== ''; } catch { return false; } };
export const portOpen = (port, host = '127.0.0.1', ms = 1500) => new Promise((res) => { const s = connect({ port, host }); const t = setTimeout(() => { s.destroy(); res(false); }, ms); s.on('connect', () => { clearTimeout(t); s.end(); res(true); }); s.on('error', () => { clearTimeout(t); res(false); }); });
// T0.2.3 (F0.2): o claude 2.1.322 não tem onFailure; um hook cujo script não existe deixa a ferramenta passar (o guard abriria).
// Cada comando de hook com caminho ($FSD_TEAM/…, $HOME/…, /…) precisa existir e ser executável; nomes soltos (node, rtk) ficam no PATH.
const TEAM_DIR = new URL('..', import.meta.url).pathname.replace(/\/$/, '');
export function hookScriptsMissing(files, { home = process.env.HOME, team = process.env.FSD_TEAM || TEAM_DIR } = {}) {
  const out = new Set();
  for (const c of Object.values(cmds(files)).flat()) {
    const exe = c.trim().split(/\s+/)[0] || ''; if (!exe.includes('/')) continue;
    const p = exe.replace(/^\$\{?HOME\}?|^~/, home || '').replace(/^\$\{?FSD_TEAM\}?/, team || '');
    if (p.includes('$')) { out.add(exe); continue; }
    try { accessSync(p, constants.X_OK); } catch { out.add(p); }
  }
  return [...out];
}
export async function check({ settingsFiles, claude = 'claude', home = process.env.HOME, team = process.env.FSD_TEAM || TEAM_DIR, probe = portOpen }) {
  const why = [];
  for (const m of hooksMissing(settingsFiles)) why.push(`hook faltando (${m})`);
  for (const p of hookScriptsMissing(settingsFiles, { home, team })) if (!/ai-memory\/ai-memory$/.test(p)) why.push(`script do hook ausente (${p})`);
  const aim = aiMemoryOf(settingsFiles, home);
  if (aim && !existsSync(aim.bin)) why.push(`ai-memory não instalado (${aim.bin})`);
  if (aim?.tokenFile && !readable(aim.tokenFile)) why.push(`sem o token do ai-memory (${aim.tokenFile})`);
  if (aim?.port && !(await probe(aim.port))) why.push(`túnel do ai-memory fechado (127.0.0.1:${aim.port})`);
  let auth = null; try { auth = JSON.parse(spawnSync(claude, ['auth', 'status'], { encoding: 'utf8', timeout: 20000 }).stdout || 'null'); } catch {}
  if (!auth?.loggedIn) why.push('claude sem login (claude auth status: loggedIn false)');
  return why;
}
// CLI (o wrapper fsd-session-exec chama como o papel): node fsd-session-preflight.mjs <settings…> → motivos; exit 1 se houver.
import { fileURLToPath } from 'node:url';
if (process.argv[1] && realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const why = await check({ settingsFiles: process.argv.slice(2), claude: process.env.FSD_PREFLIGHT_CLAUDE || 'claude' });
  if (why.length) { console.log(`a sessão não sobe:\n${why.map((w) => `- ${w}`).join('\n')}`); process.exit(1); }
}
