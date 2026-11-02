import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, rmSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { scopePaths } from '../fsdDir.js';
import { readRegistry } from '../registry.js';
import { listSkills } from '../skills.js';
import { installed, tempEnv } from '../testing.js';
import { hasConflict, planInstall } from './install.js';
import { runUninstall } from './uninstall.js';

const skill = listSkills().find((s) => s.variants.length > 1)!;
const lang = skill.variants[0]!.lang;
const request = { name: skill.name, lang };
const dirs = (env: ReturnType<typeof tempEnv>) => ({
  dest: join(env.home, '.fsd', 'skills', skill.name),
  link: join(env.home, '.claude', 'skills', skill.name),
});
const lowerVersion = (env: ReturnType<typeof tempEnv>) => {
  const registry = readRegistry('global', env);
  registry.skills[skill.name]!.version = '0.0.1';
  writeFileSync(scopePaths('global', env).installed, JSON.stringify(registry));
};

describe('install', () => {
  it('installs into .fsd/skills, registers, and skips when up to date', async () => {
    const env = tempEnv();
    assert.equal((await installed('global', request, env)).action, 'install');
    const { dest } = dirs(env);
    assert.ok(existsSync(join(dest, 'SKILL.md')));
    assert.ok(!existsSync(join(dest, 'README.md')) && !existsSync(join(dest, 'evals')));
    assert.ok(!existsSync(join(env.home, 'nook')), 'install alone does not create the base structure');
    assert.equal(readRegistry('global', env).skills[skill.name]?.lang, lang);
    assert.equal((await installed('global', request, env)).action, 'skip');
  });

  it('leaves no run directory behind', async () => {
    const env = tempEnv();
    await installed('global', request, env);
    assert.deepEqual(readdirSync(join(env.home, '.fsd')).sort(), ['installed.json', 'skills']);
  });

  it('keeps the execution bit of scripts', { skip: process.platform === 'win32' }, async () => {
    const env = tempEnv();
    const variant = skill.variants[0]!;
    const source = join(variant.dir, 'scripts');
    const executable = existsSync(source) ? readdirSync(source).filter((f) => statSync(join(source, f)).mode & 0o100) : [];
    await installed('global', { name: skill.name, lang: variant.lang }, env);
    for (const file of executable) assert.ok(statSync(join(dirs(env).dest, 'scripts', file)).mode & 0o100, file);
  });

  it('upgrades an older registered version and reinstalls a missing one', async () => {
    const env = tempEnv();
    await installed('global', request, env);
    lowerVersion(env);
    assert.equal((await installed('global', request, env)).action, 'upgrade');
    rmSync(dirs(env).dest, { recursive: true });
    assert.equal((await installed('global', request, env)).action, 'install');
    assert.ok(existsSync(dirs(env).dest));
  });

  it('project scope writes only inside the project', async () => {
    const env = tempEnv();
    await installed('project', request, env);
    assert.ok(existsSync(join(env.cwd, '.fsd', 'installed.json')));
    assert.ok(lstatSync(join(env.cwd, '.claude', 'skills', skill.name)).isSymbolicLink());
    assert.deepEqual(readdirSync(env.home), []);
  });

  it('unknown skill is a planning error and plans no work', () => {
    const plan = planInstall('global', [{ name: 'nope' }], tempEnv());
    assert.deepEqual(plan.errors, ['skill nope not found in catalog']);
    assert.equal(plan.items.length, 0);
  });
});

describe('link in .claude/skills', () => {
  it('install links .claude/skills/<name> to .fsd/skills/<name>; uninstall removes both', async () => {
    const env = tempEnv();
    await installed('global', request, env);
    const { dest, link } = dirs(env);
    assert.ok(lstatSync(link).isSymbolicLink());
    assert.equal(realpathSync(link), realpathSync(dest));
    assert.ok(existsSync(join(link, 'SKILL.md')));
    const outcome = await runUninstall('global', [skill.name], env);
    assert.equal(outcome.status, 'done');
    assert.ok(!existsSync(link) && !existsSync(dest));
    assert.deepEqual(readRegistry('global', env).skills, {});
  });

  it('recreates a missing link when the skill is up to date', async () => {
    const env = tempEnv();
    await installed('global', request, env);
    unlinkSync(dirs(env).link);
    const result = await installed('global', request, env);
    assert.equal(result.action, 'link');
    assert.ok(lstatSync(dirs(env).link).isSymbolicLink());
  });
});

describe('same-name skill in the way (SPEC 6.2 rule 3)', () => {
  const original = (env: ReturnType<typeof tempEnv>) => {
    const real = dirs(env).link;
    mkdirSync(real, { recursive: true });
    writeFileSync(join(real, 'mine.txt'), 'x');
    return real;
  };

  it('keep (default): ours is skipped, nothing changes', async () => {
    const env = tempEnv();
    const real = original(env);
    assert.ok(hasConflict('global', skill.name, env));
    const result = await installed('global', request, env);
    assert.equal(result.action, 'skip');
    assert.deepEqual(result.conflict, [real]);
    assert.ok(existsSync(join(real, 'mine.txt')));
    assert.ok(!existsSync(join(env.home, '.fsd')), 'nothing of ours was left behind');
  });

  it('unlinked: ours is installed without a link and the original is untouched', async () => {
    const env = tempEnv();
    const real = original(env);
    const result = await installed('global', { ...request, onConflict: 'unlinked' }, env);
    assert.equal(result.action, 'install');
    assert.match(result.note ?? '', /not linked/);
    assert.ok(existsSync(join(dirs(env).dest, 'SKILL.md')));
    assert.ok(!lstatSync(real).isSymbolicLink() && readFileSync(join(real, 'mine.txt'), 'utf8') === 'x');
    assert.equal(readRegistry('global', env).skills[skill.name]?.linked, false);
    // uninstalling ours leaves the original alone
    await runUninstall('global', [skill.name], env);
    assert.equal(readFileSync(join(real, 'mine.txt'), 'utf8'), 'x');
    assert.ok(!existsSync(dirs(env).dest));
  });

  it('unlinked is not available when the original is a folder in .fsd/skills', async () => {
    const env = tempEnv();
    mkdirSync(dirs(env).dest, { recursive: true });
    writeFileSync(join(dirs(env).dest, 'mine.txt'), 'x');
    const result = await installed('global', { ...request, onConflict: 'unlinked' }, env);
    assert.equal(result.action, 'skip');
    assert.equal(readFileSync(join(dirs(env).dest, 'mine.txt'), 'utf8'), 'x');
  });

  it('replace: the original is replaced by our link, and no backup is left behind', async () => {
    const env = tempEnv();
    const real = original(env);
    const result = await installed('global', { ...request, onConflict: 'replace' }, env);
    assert.match(result.note ?? '', /replaced the original/);
    assert.ok(lstatSync(real).isSymbolicLink() && !existsSync(join(real, 'mine.txt')));
    assert.deepEqual(readdirSync(join(env.home, '.claude', 'skills')), [skill.name]);
    assert.deepEqual(readdirSync(join(env.home, '.fsd')).sort(), ['installed.json', 'skills']);
  });

  it('update keeps an unlinked skill up to date without touching the link', async () => {
    const env = tempEnv();
    const real = original(env);
    await installed('global', { ...request, onConflict: 'unlinked' }, env);
    lowerVersion(env);
    const result = await installed('global', { ...request, destination: dirs(env).dest }, env);
    assert.equal(result.action, 'upgrade');
    assert.equal(readFileSync(join(real, 'mine.txt'), 'utf8'), 'x');
    assert.equal(readRegistry('global', env).skills[skill.name]?.linked, false);
  });
});
