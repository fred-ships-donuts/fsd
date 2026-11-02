import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const bin = fileURLToPath(new URL('./fsd.js', import.meta.url));
const version = (JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as { version: string }).version;
const run = (...args: string[]) => spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', stdin: 'ignore' } as never);

describe('fsd binary', () => {
  it('prints version', () => {
    for (const flag of ['-v', '--version']) {
      const r = run(flag);
      assert.equal(r.status, 0);
      assert.equal(r.stdout.trim(), version);
    }
  });
  it('help in every form, same text, exit 0', () => {
    const outs = [run(), run('-h'), run('--help')].map((r) => (assert.equal(r.status, 0), r.stdout));
    assert.ok(outs.every((o) => o === outs[0]) && outs[0]!.includes('init') && outs[0]!.includes('update'));
  });
  it('usage errors exit 1', () => {
    for (const args of [['foo'], ['init', 'x'], ['-s'], ['-u', 'init']]) assert.equal(run(...args).status, 1, args.join(' '));
  });
  it('init without TTY exits 1', () => {
    const r = run('init');
    assert.equal(r.status, 1);
    assert.match(r.stderr, /requires an interactive terminal/);
  });
});
