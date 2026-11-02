import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { readConfig, writeConfig, defaultConfig } from './config.js';
import { tempEnv } from './testing.js';
import { readRegistry, registerSkill, skillState, unregisterSkill } from './registry.js';

describe('registry', () => {
  it('missing or unreadable file is an empty registry', () => {
    const env = tempEnv();
    assert.deepEqual(readRegistry('global', env).skills, {});
    mkdirSync(join(env.home, '.fsd'));
    writeFileSync(join(env.home, '.fsd', 'installed.json'), '{ not json');
    assert.deepEqual(readRegistry('global', env).skills, {});
  });

  it('registers, keeps installedAt on update, and removes', () => {
    const env = tempEnv();
    const first = registerSkill('global', 's', { lang: 'en', version: '1.0.0', path: env.home }, env, new Date('2026-01-01'));
    const second = registerSkill('global', 's', { lang: 'en', version: '1.1.0', path: env.home }, env, new Date('2026-02-01'));
    assert.equal(second.installedAt, first.installedAt);
    assert.notEqual(second.updatedAt, first.updatedAt);
    unregisterSkill('global', 's', env);
    assert.deepEqual(readRegistry('global', env).skills, {});
  });

  it('computes the four states', () => {
    const env = tempEnv();
    const entry = registerSkill('global', 's', { lang: 'en', version: '1.0.0-alpha.2', path: env.home }, env);
    assert.equal(skillState(undefined, '1.0.0'), 'not installed');
    assert.equal(skillState(entry, '1.0.0-alpha.2'), 'up to date');
    assert.equal(skillState(entry, '1.0.0-alpha.10'), 'outdated');
    assert.equal(skillState({ ...entry, path: join(env.home, 'gone') }, '1.0.0'), 'missing');
  });
});

describe('config', () => {
  it('returns defaults for missing, unreadable or unknown schema', () => {
    const env = tempEnv();
    assert.deepEqual(readConfig(env), defaultConfig());
    mkdirSync(join(env.home, '.fsd'));
    writeFileSync(join(env.home, '.fsd', 'config.json'), '{"schema":9,"theme":"x"}');
    assert.deepEqual(readConfig(env), defaultConfig());
    writeFileSync(join(env.home, '.fsd', 'config.json'), 'garbage');
    assert.deepEqual(readConfig(env), defaultConfig());
  });

  it('round-trips and ignores invalid field types', () => {
    const env = tempEnv();
    writeConfig({ ...defaultConfig(), theme: 'donut', autoUpdate: false }, env);
    assert.equal(readConfig(env).theme, 'donut');
    assert.equal(readConfig(env).autoUpdate, false);
    writeFileSync(join(env.home, '.fsd', 'config.json'), '{"schema":1,"theme":5,"autoUpdate":"yes"}');
    assert.equal(readConfig(env).theme, 'donut');
    assert.equal(readConfig(env).autoUpdate, true);
  });
});
