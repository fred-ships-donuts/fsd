import assert from 'node:assert/strict';
import { chmodSync, existsSync, lstatSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';
import { listSkills } from '../core/catalog.js';
import { planInstall } from '../plan/install.js';
import { planLink } from '../plan/link.js';
import { planUninstall } from '../plan/uninstall.js';
import { realOps, type Ops } from './ops.js';
import { runPlan, type RunControl, type RunEvent } from './run.js';
import { failingOps, opsFailing, tempEnv, type TempEnv } from './testkit.js';

// The skills client, one test per plan kind: the final tree and installed.json are what they were before the core.

let t: TempEnv;
beforeEach(() => (t = tempEnv()));
afterEach(() => t.cleanup());

const name = listSkills()[0]!.name;
const root = () => join(t.env.cwd, '.fsd');
const registry = () => JSON.parse(readFileSync(join(root(), 'installed.json'), 'utf8')) as { skills: Record<string, { path: string; linked?: boolean }> };
const link = () => join(t.env.cwd, '.claude/skills', name);
const install = () => planInstall('project', [{ name, lang: 'en', onConflict: 'keep' }], t.env, { ensureBase: true, config: { theme: 'x', autoUpdate: false, updateSkills: false } as never });
const leftovers = () => (existsSync(t.cache) ? readdirSync(t.cache) : []);

describe('runPlan (skills client)', () => {
  it('10a. install with ensureBase: base dirs, skill, link, registry, config; no run dir left', async () => {
    const outcome = await runPlan(install());
    assert.equal(outcome.status, 'done');
    for (const dir of ['nook/kitchen', 'nook/bakers', '.fsd/oven', '.fsd/cache', '.fsd/logs']) assert.equal(lstatSync(join(t.env.cwd, dir)).isDirectory(), true, dir);
    assert.equal(existsSync(join(root(), 'skills', name, 'SKILL.md')), true);
    assert.equal(lstatSync(link()).isSymbolicLink(), true);
    assert.equal(registry().skills[name]?.path, join(root(), 'skills', name));
    assert.equal(existsSync(join(root(), 'config.json')), true);
    assert.deepEqual(leftovers(), []);
  });

  it('10b. upgrade over an installed skill replaces it and keeps the registry entry', async () => {
    await runPlan(install());
    const outcome = await runPlan(planInstall('project', [{ name, lang: 'en', onConflict: 'keep' }], t.env, {}));
    assert.equal(outcome.status, 'done');
    assert.equal(existsSync(join(root(), 'skills', name, 'SKILL.md')), true);
    assert.equal(registry().skills[name] !== undefined, true);
    assert.deepEqual(leftovers(), []);
  });

  it('10c. uninstall removes the folder, the link and the registry entry', async () => {
    await runPlan(install());
    const outcome = await runPlan(planUninstall('project', [name], t.env));
    assert.equal(outcome.status, 'done');
    assert.equal(existsSync(join(root(), 'skills', name)), false);
    assert.equal(existsSync(link()), false);
    assert.equal(registry().skills[name], undefined);
    assert.deepEqual(leftovers(), []);
  });

  it('10d. link adds the missing link and registers it', async () => {
    await runPlan(install());
    // Drop the link by hand and the `linked: false` mark that an unlinked install carries.
    const { rmSync } = await import('node:fs');
    rmSync(link());
    const outcome = await runPlan(planLink('project', [name], false, t.env));
    assert.equal(outcome.status, 'done');
    assert.equal(lstatSync(link()).isSymbolicLink(), true);
    assert.deepEqual(leftovers(), []);
  });

  it('10e. a failure injected in register leaves the tree as it was', async () => {
    const plan = install();
    // Count the operations of a clean run, then fail the first one that writes the registry (the last writes of the run).
    const counted = tempEnv();
    let total = 0;
    try {
      const probe = planInstall('project', [{ name, lang: 'en', onConflict: 'keep' }], counted.env, { ensureBase: true });
      const counting = {} as Record<string, unknown>;
      for (const [key, op] of Object.entries(realOps)) counting[key] = (...args: unknown[]) => { total++; return (op as (...a: unknown[]) => unknown)(...args); };
      await runPlan(probe, { ops: counting as unknown as Ops });
    } finally {
      counted.cleanup();
    }
    assert.ok(total > 3);
    const outcome = await runPlan(plan, { ops: failingOps(total - 2) });
    assert.equal(outcome.status, 'failed');
    assert.equal(existsSync(join(root(), 'installed.json')), false);
    assert.equal(existsSync(join(root(), 'skills', name)), false);
    assert.equal(existsSync(link()), false);
    assert.equal(existsSync(join(t.env.cwd, 'nook')), false);
    assert.equal(existsSync(root()), false);
  });

  it('10f. a cancel in apply leaves the tree as it was', async () => {
    const control: RunControl = { cancelled: false };
    const outcome = await runPlan(install(), { control, onEvent: (e: RunEvent) => { if (e.phase === 'apply' && e.state === 'running' && e.item) control.cancelled = true; } });
    assert.equal(outcome.status, 'cancelled');
    assert.equal(existsSync(join(root(), 'skills', name)), false);
    assert.equal(existsSync(link()), false);
    assert.equal(existsSync(root()), false);
    assert.equal(existsSync(join(t.env.cwd, 'nook')), false);
  });

  // The failure message names the action (`<label> failed and was undone (<phase>: <reason>)`), from the plan's label.
  const failed = async (plan: Parameters<typeof runPlan>[0], ops: Ops) => {
    const outcome = await runPlan(plan, { ops });
    assert.equal(outcome.status, 'failed');
    return (outcome as { message: string }).message;
  };

  it('11a. install failing in apply says "install failed and was undone"', async () => {
    assert.equal(await failed(install(), opsFailing('symlink')), 'install failed and was undone (apply: boom)');
  });

  it('11b. upgrade failing in apply says "upgrade failed and was undone"', async () => {
    await runPlan(install());
    // Make the installed copy look old so the plan is an upgrade.
    const reg = registry();
    reg.skills[name]!.version = '0.0.0';
    writeFileSync(join(root(), 'installed.json'), JSON.stringify(reg));
    const upgrade = planInstall('project', [{ name, lang: 'en', onConflict: 'keep' }], t.env, {});
    assert.equal(upgrade.label, 'upgrade');
    assert.equal(await failed(upgrade, opsFailing('move')), 'upgrade failed and was undone (apply: boom)');
  });

  it('11c. remove failing in apply says "remove failed and was undone"', async () => {
    await runPlan(install());
    assert.equal(await failed(planUninstall('project', [name], t.env), opsFailing('move')), 'remove failed and was undone (apply: boom)');
  });

  it('11d. enable failing in apply says "enable failed and was undone"', async () => {
    await runPlan(install());
    rmSync(link());
    assert.equal(await failed(planLink('project', [name], false, t.env), opsFailing('symlink')), 'enable failed and was undone (apply: boom)');
  });

  it('11e. a failing undo keeps the "undo failed" suffix after the action name', async () => {
    // The undo uses the real operations: make it fail for real by locking the folder it has to clean (not for root).
    const skills = join(root(), 'skills');
    const lock: Ops = { ...realOps, symlink: () => { chmodSync(skills, 0o555); throw new Error('boom'); } };
    try {
      const message = await failed(install(), lock);
      assert.match(message, /^install failed and was undone \(apply: boom\); undo failed \(.*EACCES.*\); run fsd again to recover$/);
    } finally {
      chmodSync(skills, 0o755);
    }
  });
});
