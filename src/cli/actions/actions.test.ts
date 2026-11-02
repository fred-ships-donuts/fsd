import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { tempEnv } from '../fsdDir.test.js';
import { readRegistry } from '../registry.js';
import { installSkill, hasConflict } from './install.js';
import { uninstallSkill } from './uninstall.js';
import { scopePaths } from '../fsdDir.js';
import { listSkills } from '../skills.js';

const skill = listSkills().find((s) => s.variants.length > 1)!;
const lang = skill.variants[0]!.lang;

describe('install', () => {
  it('installs, registers, and skips when up to date', () => {
    const env = tempEnv();
    const first = installSkill('global', { name: skill.name, lang }, env);
    assert.equal(first.action, 'install');
    const dest = join(scopePaths('global', env).skills, skill.name);
    assert.ok(existsSync(join(dest, 'SKILL.md')));
    assert.ok(!existsSync(join(dest, 'README.md')) && !existsSync(join(dest, 'evals')));
    assert.ok(!existsSync(join(env.home, 'nook')), 'install must not create the base structure');
    assert.equal(readRegistry('global', env).skills[skill.name]?.lang, lang);
    assert.equal(installSkill('global', { name: skill.name, lang }, env).action, 'skip');
  });

  it('keeps the execution bit of scripts', { skip: process.platform === 'win32' }, () => {
    const env = tempEnv();
    const variant = skill.variants[0]!;
    const source = join(variant.dir, 'scripts');
    const executable = existsSync(source) ? readdirSync(source).filter((f) => statSync(join(source, f)).mode & 0o100) : [];
    installSkill('global', { name: skill.name, lang: variant.lang }, env);
    for (const file of executable) {
      assert.ok(statSync(join(scopePaths('global', env).skills, skill.name, 'scripts', file)).mode & 0o100, file);
    }
  });

  it('upgrades an older registered version and reinstalls a missing one', () => {
    const env = tempEnv();
    installSkill('global', { name: skill.name, lang }, env);
    const registry = readRegistry('global', env);
    registry.skills[skill.name]!.version = '0.0.1';
    writeFileSync(scopePaths('global', env).installed, JSON.stringify(registry));
    assert.equal(installSkill('global', { name: skill.name, lang }, env).action, 'upgrade');
    const dest = join(scopePaths('global', env).skills, skill.name);
    uninstallFolder(dest);
    assert.equal(installSkill('global', { name: skill.name, lang }, env).action, 'install');
    assert.ok(existsSync(dest));
  });

  it('treats a folder outside the registry as a conflict', () => {
    const env = tempEnv();
    const dest = join(scopePaths('project', env).skills, skill.name);
    mkdirSync(dest, { recursive: true });
    writeFileSync(join(dest, 'mine.txt'), 'x');
    assert.ok(hasConflict('project', skill.name, env));
    const skipped = installSkill('project', { name: skill.name, lang }, env);
    assert.equal(skipped.action, 'skip');
    assert.ok(existsSync(join(dest, 'mine.txt')));
    assert.equal(installSkill('project', { name: skill.name, lang, overwriteConflict: true }, env).action, 'install');
    assert.ok(!existsSync(join(dest, 'mine.txt')));
  });

  it('project scope never touches home', () => {
    const env = tempEnv();
    installSkill('project', { name: skill.name, lang }, env);
    assert.ok(existsSync(join(env.cwd, '.fsd', 'installed.json')));
    assert.ok(!existsSync(join(env.home, '.fsd')) && !existsSync(join(env.home, '.claude')));
  });

  it('errors for unknown skill', () => {
    assert.throws(() => installSkill('global', { name: 'nope' }, tempEnv()), /not found in catalog/);
  });
});

describe('uninstall', () => {
  it('removes folder and entry only for registered skills', () => {
    const env = tempEnv();
    installSkill('global', { name: skill.name, lang }, env);
    const other = join(scopePaths('global', env).skills, 'other');
    mkdirSync(other, { recursive: true });
    const result = uninstallSkill('global', skill.name, env);
    assert.equal(result.action, 'remove');
    assert.ok(!existsSync(join(scopePaths('global', env).skills, skill.name)));
    assert.ok(existsSync(other));
    assert.deepEqual(readRegistry('global', env).skills, {});
    assert.throws(() => uninstallSkill('global', 'other', env), /is not installed/);
  });

  it('missing folder only clears the entry', () => {
    const env = tempEnv();
    installSkill('global', { name: skill.name, lang }, env);
    uninstallFolder(join(scopePaths('global', env).skills, skill.name));
    assert.match(uninstallSkill('global', skill.name, env).note ?? '', /missing/);
    assert.deepEqual(readRegistry('global', env).skills, {});
  });
});

function uninstallFolder(path: string): void {
  rmSync(path, { recursive: true, force: true });
}
