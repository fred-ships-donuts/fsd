import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { planInstall } from './actions/install.js';
import { planUninstall } from './actions/uninstall.js';
import { scopePaths } from './fsdDir.js';
import { failingOps, type Ops, type OpName } from './ops.js';
import { readRegistry } from './registry.js';
import { runPlan, type RunEvent } from './run.js';
import { listSkills } from './skills.js';
import { install, installed, snapshot, tempEnv } from './testing.js';

const skill = listSkills().find((s) => s.variants.length > 1)!;
const lang = skill.variants[0]!.lang;
const request = { name: skill.name, lang };
type Env = ReturnType<typeof tempEnv>;
const tree = (env: Env) => ({ home: snapshot(env.home), cwd: snapshot(env.cwd) });
const lowerVersion = (env: Env) => {
  const registry = readRegistry('global', env);
  registry.skills[skill.name]!.version = '0.0.1';
  writeFileSync(scopePaths('global', env).installed, JSON.stringify(registry));
};
const endsWith = (name: string) => (args: unknown[]) => String(args[0]).endsWith(name);

// Failures are injected into the operations, so these tests need no special permissions and run on any user and platform.
type Fault = [string, OpName, number | ((args: unknown[], call: number) => boolean)];
const faults = (extra: Fault[] = []): Fault[] => [
  ['journal write', 'writeJson', 1],
  ['stage copy', 'copyDir', 1],
  ['registry write', 'writeJson', endsWith('installed.json')],
  ...extra,
];

describe('a failed run is undone completely (SPEC 6.9)', () => {
  for (const [label, op, when] of faults([['link', 'symlink', 1], ['move into place', 'move', 1]])) {
    it(`fresh install, failure in ${label}`, async () => {
      const env = tempEnv();
      const before = tree(env);
      const outcome = await install('global', request, env, { ops: failingOps(op, when) });
      assert.equal(outcome.status, 'failed');
      assert.match((outcome as { message: string }).message, /undone/);
      assert.deepEqual(tree(env), before);
    });
  }

  it('config write failure also undoes the registry', async () => {
    const env = tempEnv();
    const before = tree(env);
    const plan = planInstall('global', [request], env, { ensureBase: true, config: { schema: 1, theme: 'dracula', autoUpdate: true, updateSkills: false } });
    const outcome = await runPlan(plan, { ops: failingOps('writeJson', endsWith('config.json')) });
    assert.equal(outcome.status, 'failed');
    assert.deepEqual(tree(env), before);
  });

  for (const [label, op, when] of faults([['displace previous', 'move', 1], ['move into place', 'move', 2]])) {
    it(`upgrade, failure in ${label}: the previous version comes back byte for byte`, async () => {
      const env = tempEnv();
      await installed('global', request, env);
      writeFileSync(join(env.home, '.fsd', 'skills', skill.name, 'previous.txt'), 'old');
      lowerVersion(env);
      const before = tree(env);
      const outcome = await install('global', request, env, { ops: failingOps(op, when) });
      assert.equal(outcome.status, 'failed');
      assert.deepEqual(tree(env), before);
    });
  }

  for (const [label, op, when] of faults([['displace the original', 'move', 2], ['link', 'symlink', 1]])) {
    it(`replace, failure in ${label}: the original comes back byte for byte`, async () => {
      const env = tempEnv();
      const real = join(env.home, '.claude', 'skills', skill.name);
      mkdirSync(real, { recursive: true });
      writeFileSync(join(real, 'mine.txt'), 'x');
      const before = tree(env);
      const outcome = await install('global', { ...request, onConflict: 'replace' }, env, { ops: failingOps(op, when) });
      assert.equal(outcome.status, 'failed');
      assert.deepEqual(tree(env), before);
    });
  }

  it('uninstall failure restores the folder, the link and the entry', async () => {
    const env = tempEnv();
    await installed('global', request, env);
    const before = tree(env);
    for (const [op, when] of [['move', 2], ['writeJson', endsWith('installed.json')]] as Array<[OpName, Fault[2]]>) {
      const outcome = await runPlan(planUninstall('global', [skill.name], env), { ops: failingOps(op, when) });
      assert.equal(outcome.status, 'failed', op);
      assert.deepEqual(tree(env), before, op);
    }
  });

  it('with two skills, a failure in the second undoes the first too', async () => {
    const env = tempEnv();
    const other = listSkills().find((s) => s.name !== skill.name)!;
    const before = tree(env);
    const plan = planInstall('global', [request, { name: other.name, lang: other.variants[0]!.lang }], env);
    const outcome = await runPlan(plan, { ops: failingOps('symlink', 2) });
    assert.equal(outcome.status, 'failed');
    assert.deepEqual(tree(env), before);
  });
});

describe('cancelling', () => {
  it('stops between operations in the apply phase and undoes everything', async () => {
    const env = tempEnv();
    const before = tree(env);
    const control = { cancelled: false };
    const outcome = await install('global', request, env, {
      control,
      onEvent: (e: RunEvent) => {
        if (e.phase === 'apply' && e.item) control.cancelled = true;
      },
    });
    assert.equal(outcome.status, 'cancelled');
    assert.deepEqual(tree(env), before);
  });

  it('after the registry is written it is too late: the run completes', async () => {
    const env = tempEnv();
    const control = { cancelled: false };
    const outcome = await install('global', request, env, {
      control,
      onEvent: (e: RunEvent) => {
        if (e.phase === 'conclude') control.cancelled = true;
      },
    });
    assert.equal(outcome.status, 'done');
    assert.ok(readRegistry('global', env).skills[skill.name]);
  });
});

describe('the phases', () => {
  it('report running and done for the five phases, in order', async () => {
    const env = tempEnv();
    const seen: string[] = [];
    await install('global', request, env, { onEvent: (e) => seen.push(`${e.phase}:${e.state}${e.item ? `:${e.item}` : ''}`) });
    assert.deepEqual(seen.filter((s) => !s.endsWith(`:${skill.name}`)), ['verify:running', 'verify:done', 'prepare:running', 'prepare:done', 'apply:running', 'apply:done', 'register:running', 'register:done', 'conclude:running', 'conclude:done']);
    assert.ok(seen.includes(`apply:running:${skill.name}`));
  });

  it('a run with nothing to do writes nothing at all', async () => {
    const env = tempEnv();
    await installed('global', request, env);
    const before = tree(env);
    const outcome = await install('global', request, env);
    assert.equal(outcome.status, 'done');
    assert.deepEqual(tree(env), before);
  });

  it('state that changed after the summary stops the run before writing anything', async () => {
    const env = tempEnv();
    const plan = planInstall('global', [request], env);
    mkdirSync(join(env.home, '.claude', 'skills', skill.name), { recursive: true });
    const before = tree(env);
    const outcome = await runPlan(plan);
    assert.equal(outcome.status, 'changed');
    assert.match((outcome as { message: string }).message, /state changed since the summary/);
    assert.deepEqual(tree(env), before);
  });

  it('refuses a registered path outside the scope directories', async () => {
    const env = tempEnv();
    await installed('global', request, env);
    const registry = readRegistry('global', env);
    registry.skills[skill.name]!.path = join(env.home, 'Documents');
    writeFileSync(scopePaths('global', env).installed, JSON.stringify(registry));
    const outcome = await runPlan(planUninstall('global', [skill.name], env));
    assert.equal(outcome.status, 'failed');
    assert.match((outcome as { message: string }).message, /outside the scope/);
  });

  it('install flow creates only the base structure plus what it installs', async () => {
    const env = tempEnv();
    await runPlan(planInstall('global', [request], env, { ensureBase: true }));
    assert.deepEqual(readdirSync(env.home).sort(), ['.claude', '.fsd', 'nook']);
    assert.deepEqual(readdirSync(join(env.home, 'nook')).sort(), ['bakers', 'kitchen']);
    assert.deepEqual(readdirSync(join(env.home, '.fsd')).sort(), ['cache', 'installed.json', 'logs', 'oven', 'skills']);
    assert.deepEqual(readdirSync(join(env.home, '.fsd', 'cache')), []);
  });
});

describe('interrupted runs (SPEC 6.9 rules 3 and 4)', () => {
  const crash = fileURLToPath(new URL('./crashChild.js', import.meta.url));
  const killedAt = (env: Env, at: 'symlink' | 'move') => spawnSync(process.execPath, [crash, env.home, env.cwd, skill.name, lang, at]);
  // The registry holds absolute paths and timestamps, so compare it by its entries instead of its bytes.
  const normalized = (env: Env) => {
    const tree = snapshot(env.home);
    delete tree['/.fsd/installed.json'];
    return JSON.stringify(tree).split(env.home).join('HOME');
  };
  const entries = (env: Env) => Object.entries(readRegistry('global', env).skills).map(([name, e]) => [name, e.lang, e.version, e.path.replace(env.home, 'HOME')]);

  for (const at of ['move', 'symlink'] as const) {
    it(`a process killed before ${at === 'move' ? 'moving the copy into place' : 'creating the link'} is recovered by the next run`, async () => {
      const env = tempEnv();
      const child = killedAt(env, at);
      assert.equal(child.signal, 'SIGKILL');
      assert.ok(readdirSync(join(env.home, '.fsd', 'cache')).some((n) => n.startsWith('run-')), 'the dead run left its directory');

      const outcome = await runPlan(planInstall('global', [request], env, { ensureBase: true }));
      assert.equal(outcome.status, 'done');
      assert.ok((outcome as { warnings: string[] }).warnings.includes('recovered an interrupted run'));

      const clean = tempEnv();
      await runPlan(planInstall('global', [request], clean, { ensureBase: true }));
      assert.equal(normalized(env), normalized(clean), 'same tree as a run that was never interrupted');
      assert.deepEqual(entries(env), entries(clean));
      assert.ok(lstatSync(join(env.home, '.claude', 'skills', skill.name)).isSymbolicLink());
    });
  }

  it('a live run in the same scope blocks this one and nothing is changed', async () => {
    const env = tempEnv();
    const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 20000)']);
    try {
      mkdirSync(join(env.home, '.fsd', 'cache', `run-${child.pid}-x`), { recursive: true });
      const before = tree(env);
      const outcome = await install('global', request, env);
      assert.equal(outcome.status, 'busy');
      assert.equal((outcome as { message: string }).message, 'another fsd run is in progress');
      assert.deepEqual(tree(env), before);
    } finally {
      child.kill();
    }
  });

  it('a run directory without a journal from a dead process is just removed', async () => {
    const env = tempEnv();
    const dead = spawnSync(process.execPath, ['-e', '']).pid;
    mkdirSync(join(env.home, '.fsd', 'cache', `run-${dead}-x`), { recursive: true });
    const outcome = await install('global', request, env);
    assert.equal(outcome.status, 'done');
    assert.ok(!existsSync(join(env.home, '.fsd', 'cache')) || readdirSync(join(env.home, '.fsd', 'cache')).length === 0);
    rmSync(env.home, { recursive: true, force: true });
  });
});
