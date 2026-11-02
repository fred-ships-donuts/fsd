import assert from 'node:assert/strict';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { installSkill } from '../actions/install.js';
import { scopePaths } from '../fsdDir.js';
import { tempEnv } from '../fsdDir.test.js';
import { readRegistry } from '../registry.js';
import { listSkills } from '../skills.js';
import { initCommand } from './init.js';
import { updateCliCommand, updateSkillsCommand, type Io, type UpdateDeps } from './update.js';

const skill = listSkills()[0]!;
const lang = skill.variants[0]!.lang;
const capture = () => {
  const lines: string[] = [];
  const io: Io = { out: (l) => lines.push(l), err: (l) => lines.push(`ERR ${l}`) };
  return { io, lines };
};

describe('update skill', () => {
  it('skips up to date, upgrades outdated, reinstalls missing', () => {
    const env = tempEnv();
    installSkill('global', { name: skill.name, lang }, env);
    const a = capture();
    assert.equal(updateSkillsCommand(undefined, a.io, env), 0);
    assert.match(a.lines[0]!, /^skip/);

    const registry = readRegistry('global', env);
    registry.skills[skill.name]!.version = '0.0.1';
    writeFileSync(scopePaths('global', env).installed, JSON.stringify(registry));
    const b = capture();
    assert.equal(updateSkillsCommand(skill.name, b.io, env), 0);
    assert.match(b.lines[0]!, /^upgrade/);

    rmSync(join(scopePaths('global', env).skills, skill.name), { recursive: true });
    const c = capture();
    assert.equal(updateSkillsCommand(undefined, c.io, env), 0);
    assert.match(c.lines[0]!, /^install/);
  });

  it('errors for a name that is not installed or not in the catalog', () => {
    const env = tempEnv();
    const a = capture();
    assert.equal(updateSkillsCommand('nope', a.io, env), 1);
    assert.equal(a.lines[0], 'ERR skill nope is not installed');

    const registry = { schema: 1, skills: { ghost: { scope: 'global', lang: 'en', version: '1.0.0', path: env.home, installedAt: 'x', updatedAt: 'x' } } };
    writeFileSync(join(env.home, '.fsd-tmp'), '');
    installSkill('global', { name: skill.name, lang }, env);
    writeFileSync(scopePaths('global', env).installed, JSON.stringify(registry));
    const b = capture();
    assert.equal(updateSkillsCommand('ghost', b.io, env), 1);
    assert.equal(b.lines[0], 'ERR skill ghost not found in catalog');
  });

  it('includes the project scope only when it has a registry, and never creates the base structure', () => {
    const env = tempEnv();
    installSkill('project', { name: skill.name, lang }, env);
    const a = capture();
    assert.equal(updateSkillsCommand(undefined, a.io, env), 0);
    assert.equal(a.lines.length, 1);
    assert.ok(!existsSync(join(env.cwd, 'nook')));
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
  it('without TTY exits 1 and does not open the wizard', async () => {
    let opened = false;
    const { io, lines } = capture();
    const code = await initCommand('1.0.0', io, { isTTY: () => false, openWizard: async () => ((opened = true), 0) });
    assert.equal(code, 1);
    assert.ok(!opened);
    assert.equal(lines[0], 'ERR fsd init requires an interactive terminal');
  });
});
