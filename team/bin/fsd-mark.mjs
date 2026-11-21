// fsd-mark.mjs — as marcas de um branch (a tarefa e o dono do worktree). F2.2: no repositório entre uids o .git/config é do root,
// então na sessão nova (FSD_RUNNER=session) as marcas ficam num arquivo do papel ($HOME/.fsd/marks.json, 0600); no time antigo
// (tmux) seguem na config do git (branch.<b>.fsd-issue / fsd-agent). markGet lê o arquivo primeiro e cai na config.
import { readFileSync, writeFileSync, mkdirSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const session = () => process.env.FSD_RUNNER === 'session';
const file = () => join(process.env.HOME || '', '.fsd', 'marks.json');
const load = () => { try { return JSON.parse(readFileSync(file(), 'utf8')); } catch { return {}; } };
const git = (cwd, ...a) => spawnSync('git', ['-C', cwd, ...a], { encoding: 'utf8' });
const KEY = { issue: 'fsd-issue', agent: 'fsd-agent' };
export function markSet(branch, marks, { repo }) {
  if (session()) {
    const all = load(); const cur = { ...(all[branch] || {}) };
    for (const [k, v] of Object.entries(marks)) { if (v == null || v === '') delete cur[k]; else cur[k] = String(v); }
    if (Object.keys(cur).length) all[branch] = cur; else delete all[branch];
    mkdirSync(join(process.env.HOME || '', '.fsd'), { recursive: true, mode: 0o700 });
    const f = file(), tmp = `${f}.${process.pid}.tmp`; writeFileSync(tmp, JSON.stringify(all, null, 1) + '\n', { mode: 0o600 }); renameSync(tmp, f);
    return true;
  }
  let ok = true;
  for (const [k, v] of Object.entries(marks)) ok = (v == null || v === '' ? git(repo, 'config', '--unset', `branch.${branch}.${KEY[k]}`) : git(repo, 'config', `branch.${branch}.${KEY[k]}`, String(v))).status === 0 && ok;
  return ok;
}
export function markGet(branch, key, { cwd }) {
  const f = load()[branch]?.[key]; if (f) return f;
  const r = git(cwd, 'config', '--get', `branch.${branch}.${KEY[key]}`); return r.status === 0 ? r.stdout.trim() : '';
}
