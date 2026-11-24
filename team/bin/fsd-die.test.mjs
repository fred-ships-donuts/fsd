// fsd-lib die: a biblioteca lança; só o processo que não trata o erro sai, com a mensagem e o código de sempre.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const BIN = dirname(fileURLToPath(import.meta.url));
const script = (body) => {
  const f = join(mkdtempSync(join(tmpdir(), 'die-')), 's.mjs'); writeFileSync(f, `const L = await import(${JSON.stringify(join(BIN, 'fsd-lib.mjs'))});\n${body}\n`);
  return spawnSync(process.execPath, [f], { encoding: 'utf8', env: { ...process.env, FSD_STATE: mkdtempSync(join(tmpdir(), 'ds-')) } });
};

test('an uncaught die prints the message as it is and exits with its code', () => {
  const r = script("L.die('linha 1\\nlinha 2', 3);"); assert.equal(r.status, 3); assert.equal(r.stdout, 'linha 1\nlinha 2\n'); assert.equal(r.stderr, '');
  assert.equal(script("L.die('x');").status, 1);
  const a = script("await (async () => { L.die('async', 4); })();"); assert.equal(a.status, 4); assert.equal(a.stdout, 'async\n');
  const p = script("Promise.resolve().then(() => L.die('solta', 5));"); assert.equal(p.status, 5); assert.equal(p.stdout, 'solta\n');
  const t = script("setTimeout(() => L.die('timer', 6), 1);"); assert.equal(t.status, 6); assert.equal(t.stdout, 'timer\n');
});

test('a caller can handle die: catch sees the code, finally runs, the process goes on', () => {
  const c = script("try { L.die('falhou', 4); } catch (e) { console.log('pego', e.code, e.message); } console.log('segue');");
  assert.equal(c.status, 0); assert.equal(c.stdout, 'pego 4 falhou\nsegue\n');
  const f = script("try { L.die('falhou', 4); } finally { console.log('limpeza'); }"); assert.equal(f.status, 4); assert.equal(f.stdout, 'limpeza\nfalhou\n');
  const r = script("try { L.run('false', []); } catch (e) { console.log('run', e.code); }"); assert.equal(r.status, 0); assert.equal(r.stdout, 'run 4\n');
});

test('any other error keeps the name of the command in front', () => {
  const r = script("throw new Error('bug');"); assert.equal(r.status, 4); assert.equal(r.stdout, 's.mjs: bug\n');
});
