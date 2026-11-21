// F1.10: fsd-trash recusa /home/<usuário> (o padrão antigo /home/*/ nunca casava) e esvazia pela data de entrada, não pelo mtime.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, mkdirSync, existsSync, utimesSync, readdirSync } from 'node:fs';
import { tmpdir, homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
const trash = (args, env = {}) => spawnSync(join(BIN, 'fsd-trash'), args, { encoding: 'utf8', env: { ...process.env, FSD_AGENT: 'test', ...env } });
const stamp = (daysAgo) => { const d = new Date(Date.now() - daysAgo * 864e5); const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`; };

test('refuses /home/<user>, $HOME, the repo and any folder that holds them (dry)', () => {
  const repo = mkdtempSync(join(tmpdir(), 'repo-'));
  for (const p of [dirname(homedir()) === '/home' ? homedir() : '/', homedir(), repo, dirname(repo), '/', '/home']) {
    if (!existsSync(p)) continue;
    const r = trash([p], { FSD_DRY: '1', FSD_REPO: repo, FSD_TRASH_DIR: mkdtempSync(join(tmpdir(), 'tr-')) });
    assert.equal(r.status, 1, p); assert.match(r.stderr, /recusado/, p);
  }
  const inside = join(repo, 'x'); writeFileSync(inside, '');
  assert.match(trash([inside], { FSD_DRY: '1', FSD_REPO: repo, FSD_TRASH_DIR: mkdtempSync(join(tmpdir(), 'tr-')) }).stdout, /\[dry\]/);
});

test('an old file moved now survives the next run; an entry from 4 days ago is emptied', () => {
  const root = mkdtempSync(join(tmpdir(), 'tr-')), work = mkdtempSync(join(tmpdir(), 'w-')), env = { FSD_TRASH_DIR: root, FSD_REPO: work };
  const old = join(work, 'old.txt'); writeFileSync(old, 'x'); utimesSync(old, new Date(Date.now() - 30 * 864e5), new Date(Date.now() - 30 * 864e5));
  assert.equal(trash([old], env).status, 0);
  mkdirSync(join(root, 'test'), { recursive: true });
  const gone = join(root, 'test', `${stamp(4)}-gone.txt`); writeFileSync(gone, '');
  const kept = join(root, 'test', `${stamp(1)}-kept.txt`); writeFileSync(kept, '');
  const nodate = join(root, 'test', 'nodate.txt'); writeFileSync(nodate, '');
  const next = join(work, 'next.txt'); writeFileSync(next, ''); assert.equal(trash([next], env).status, 0);
  const left = readdirSync(join(root, 'test'));
  assert.ok(left.some((f) => f.endsWith('-old.txt')), left.join(' '));
  assert.ok(left.some((f) => f.endsWith('-next.txt')));
  assert.ok(existsSync(kept) && existsSync(nodate));
  assert.equal(existsSync(gone), false);
});
