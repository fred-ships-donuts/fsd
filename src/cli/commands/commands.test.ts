import assert from 'node:assert/strict';
import { existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { scopePaths } from '../fsdDir.js';
import { readRegistry } from '../registry.js';
import { installed, snapshot, tempEnv } from '../testing.js';
import { listSkills } from '../skills.js';
import { defaultConfig, readConfig, writeConfig } from '../config.js';
import { initCommand, type InitDeps } from './init.js';
import { linkSkillsCommand } from './link.js';
import { updateCliCommand, updateSkillsCommand, type Io, type UpdateDeps } from './update.js';

const skill = listSkills()[0]!;
const lang = skill.variants[0]!.lang;
const capture = () => {
  const lines: string[] = [];
  const io: Io = { out: (l) => lines.push(l), err: (l) => lines.push(`ERR ${l}`) };
  return { io, lines };
};

describe('update skill', () => {
  it('skips up to date, upgrades outdated, reinstalls missing', async () => {
    const env = tempEnv();
    await installed('global', { name: skill.name, lang }, env);
    const a = capture();
    assert.equal(await updateSkillsCommand(undefined, a.io, env), 0);
    assert.match(a.lines[0]!, /^skip/);

    const registry = readRegistry('global', env);
    registry.skills[skill.name]!.version = '0.0.1';
    writeFileSync(scopePaths('global', env).installed, JSON.stringify(registry));
    const b = capture();
    assert.equal(await updateSkillsCommand(skill.name, b.io, env), 0);
    assert.match(b.lines[0]!, /^upgrade/);

    rmSync(join(scopePaths('global', env).fsd, 'skills', skill.name), { recursive: true });
    const c = capture();
    assert.equal(await updateSkillsCommand(undefined, c.io, env), 0);
    assert.match(c.lines[0]!, /^install/);
  });

  it('errors for a name that is not installed or not in the catalog', async () => {
    const env = tempEnv();
    const a = capture();
    assert.equal(await updateSkillsCommand('nope', a.io, env), 1);
    assert.equal(a.lines[0], 'ERR skill nope is not installed');

    const registry = { schema: 1, skills: { ghost: { scope: 'global', lang: 'en', version: '1.0.0', path: join(env.home, '.fsd', 'skills', 'ghost'), installedAt: 'x', updatedAt: 'x' } } };
    mkdirSync(join(env.home, '.fsd'), { recursive: true });
    writeFileSync(scopePaths('global', env).installed, JSON.stringify(registry));
    const b = capture();
    assert.equal(await updateSkillsCommand('ghost', b.io, env), 1);
    assert.equal(b.lines[0], 'ERR skill ghost not found in catalog');
  });

  it('includes the project scope only when it has a registry, and never creates the base structure', async () => {
    const env = tempEnv();
    await installed('project', { name: skill.name, lang }, env);
    const a = capture();
    assert.equal(await updateSkillsCommand(undefined, a.io, env), 0);
    assert.equal(a.lines.length, 1);
    assert.ok(!existsSync(join(env.cwd, 'nook')));
  });

  const withOriginal = async () => {
    const env = tempEnv();
    await installed('global', { name: skill.name, lang }, env);
    const link = join(env.home, '.claude', 'skills', skill.name);
    rmSync(link);
    mkdirSync(link);
    writeFileSync(join(link, 'mine.txt'), 'x');
    return { env, link };
  };

  it('a same-name original in the way is kept without --force: message, exit 1, others still updated', async () => {
    const { env, link } = await withOriginal();
    const out = capture();
    assert.equal(await updateSkillsCommand(skill.name, out.io, env), 1);
    assert.match(out.lines.join('\n'), new RegExp(`ERR skill ${skill.name}: .* exists and is not managed by fsd \\(use --force to replace\\)`));
    assert.equal(readFileSync(join(link, 'mine.txt'), 'utf8'), 'x');
  });

  it('--force replaces the original with our link; without a conflict it changes nothing', async () => {
    const { env, link } = await withOriginal();
    const out = capture();
    assert.equal(await updateSkillsCommand(undefined, out.io, env, { force: true }), 0);
    assert.match(out.lines[0]!, /replaced the original/);
    assert.ok(lstatSync(link).isSymbolicLink());
    const before = snapshot(env.home);
    assert.equal(await updateSkillsCommand(undefined, capture().io, env, { force: true }), 0);
    assert.deepEqual(snapshot(env.home), before);
  });

  it('a skill kept unlinked is updated without touching the link, even with --force', async () => {
    const env = tempEnv();
    const real = join(env.home, '.claude', 'skills', skill.name);
    mkdirSync(real, { recursive: true });
    writeFileSync(join(real, 'mine.txt'), 'x');
    await installed('global', { name: skill.name, lang, onConflict: 'unlinked' }, env);
    const registry = readRegistry('global', env);
    registry.skills[skill.name]!.version = '0.0.1';
    writeFileSync(scopePaths('global', env).installed, JSON.stringify(registry));
    assert.equal(await updateSkillsCommand(undefined, capture().io, env, { force: true }), 0);
    assert.equal(readFileSync(join(real, 'mine.txt'), 'utf8'), 'x');
    assert.equal(readRegistry('global', env).skills[skill.name]?.version, listSkills().find((s) => s.name === skill.name)!.variants[0]!.version);
  });
});

describe('link skill', () => {
  const unlinked = async () => {
    const env = tempEnv();
    const real = join(env.home, '.claude', 'skills', skill.name);
    mkdirSync(real, { recursive: true });
    writeFileSync(join(real, 'mine.txt'), 'x');
    await installed('global', { name: skill.name, lang, onConflict: 'unlinked' }, env);
    return { env, real };
  };

  it('with the way blocked: exit 1 without --force, replaces with --force and records linked', async () => {
    const { env, real } = await unlinked();
    const a = capture();
    assert.equal(await linkSkillsCommand(skill.name, a.io, env), 1);
    assert.match(a.lines[0]!, /use --force to replace/);
    assert.equal(readFileSync(join(real, 'mine.txt'), 'utf8'), 'x');

    const b = capture();
    assert.equal(await linkSkillsCommand(skill.name, b.io, env, { force: true }), 0);
    assert.ok(lstatSync(real).isSymbolicLink());
    assert.equal(readRegistry('global', env).skills[skill.name]?.linked, undefined);
    assert.match(b.lines[0]!, /^link/);
  });

  it('with the way free: links without --force; already linked is a skip', async () => {
    const { env, real } = await unlinked();
    rmSync(real, { recursive: true });
    assert.equal(await linkSkillsCommand(undefined, capture().io, env), 0);
    assert.ok(lstatSync(real).isSymbolicLink());
    const again = capture();
    assert.equal(await linkSkillsCommand(undefined, again.io, env), 0);
    assert.match(again.lines[0]!, /already linked/);
  });

  it('name not installed is an error', async () => {
    const out = capture();
    assert.equal(await linkSkillsCommand('nope', out.io, tempEnv()), 1);
    assert.equal(out.lines[0], 'ERR skill nope is not installed');
  });
});

describe('update (CLI)', () => {
  const deps = (over: Partial<UpdateDeps> = {}): UpdateDeps => ({
    isGlobal: () => true,
    fetchLatest: async () => '9.9.9',
    install: () => true,
    updateSkills: () => 0,
    updateSkillsEnabled: () => false,
    ...over,
  });

  it('npx: nothing to update, exit 0', async () => {
    const { io, lines } = capture();
    assert.equal(await updateCliCommand('1.0.0', io, deps({ isGlobal: () => false })), 0);
    assert.equal(lines[0], 'nothing to update (not installed globally)');
  });
  it('network failure exits 1', async () => {
    const { io } = capture();
    assert.equal(await updateCliCommand('1.0.0', io, deps({ fetchLatest: async () => { throw new Error('offline'); } })), 1);
  });
  it('installs a newer version, then runs the skills step when enabled', async () => {
    let skills = 0;
    const { io } = capture();
    assert.equal(await updateCliCommand('1.0.0', io, deps({ updateSkillsEnabled: () => true, updateSkills: () => (skills++, 0) })), 0);
    assert.equal(skills, 1);
  });
  it('up to date does not install', async () => {
    let installs = 0;
    const { io } = capture();
    await updateCliCommand('9.9.9', io, deps({ install: () => (installs++, true) }));
    assert.equal(installs, 0);
  });
});

describe('init', () => {
  const deps = (env: ReturnType<typeof tempEnv>, over: Partial<InitDeps> = {}): InitDeps => ({
    isTTY: () => true,
    openWizard: async () => 0,
    globalInstall: () => true,
    fetchLatest: async () => '0.0.1',
    installLatest: () => true,
    now: () => new Date('2026-11-01T12:00:00Z'),
    env,
    ...over,
  });

  it('without TTY exits 1 and does not open the wizard', async () => {
    let opened = false;
    const { io, lines } = capture();
    const code = await initCommand('1.0.0', io, deps(tempEnv(), { isTTY: () => false, openWizard: async () => ((opened = true), 0) }));
    assert.equal(code, 1);
    assert.ok(!opened);
    assert.equal(lines[0], 'ERR fsd init requires an interactive terminal');
  });

  it('opening never creates a file, even with auto-update on and a global install; the check time goes to the wizard', async () => {
    const env = tempEnv();
    let received: string | undefined;
    await initCommand('1.0.0', capture().io, deps(env, { openWizard: async (o) => ((received = o.lastUpdateCheck), 0) }));
    assert.deepEqual(snapshot(env.home), {});
    assert.deepEqual(snapshot(env.cwd), {});
    assert.equal(received, '2026-11-01T12:00:00.000Z');
  });

  it('saves the check time right away only when config.json already exists', async () => {
    const env = tempEnv();
    writeConfig({ ...defaultConfig(), theme: 'dark' }, env);
    await initCommand('1.0.0', capture().io, deps(env));
    assert.equal(readConfig(env).lastUpdateCheck, '2026-11-01T12:00:00.000Z');
    assert.equal(readConfig(env).theme, 'dark');
  });

  it('autoUpdate off, npx, or a check made less than 24h ago: no network, no file', async () => {
    for (const setup of [
      (env: ReturnType<typeof tempEnv>) => ({ env, over: {} as Partial<InitDeps>, config: { ...defaultConfig(), autoUpdate: false } }),
      (env: ReturnType<typeof tempEnv>) => ({ env, over: { globalInstall: () => false }, config: undefined }),
      (env: ReturnType<typeof tempEnv>) => ({ env, over: {}, config: { ...defaultConfig(), lastUpdateCheck: '2026-11-01T00:00:00.000Z' } }),
    ]) {
      const env = tempEnv();
      const { over, config } = setup(env);
      if (config) writeConfig(config, env);
      const before = snapshot(env.home);
      let fetched = 0;
      await initCommand('1.0.0', capture().io, deps(env, { ...over, fetchLatest: async () => (fetched++, '9.9.9') }));
      assert.equal(fetched, 0);
      assert.deepEqual(snapshot(env.home), before);
    }
  });
});
