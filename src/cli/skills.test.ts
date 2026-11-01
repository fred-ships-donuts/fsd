import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';
import { compareVersions, isValidVersion, listSkills, readFrontmatter, skillsSource } from './skills.js';

describe('compareVersions', () => {
  it('orders pre-releases by semver precedence', () => {
    const ordered = ['1.0.0-alpha.2', '1.0.0-alpha.10', '1.0.0-beta', '1.0.0', '1.0.1', '2.0.0'];
    for (let i = 0; i < ordered.length - 1; i++) {
      assert.equal(compareVersions(ordered[i]!, ordered[i + 1]!), -1, `${ordered[i]} < ${ordered[i + 1]}`);
      assert.equal(compareVersions(ordered[i + 1]!, ordered[i]!), 1);
    }
  });

  it('treats equal versions and build metadata as equal', () => {
    assert.equal(compareVersions('1.2.3', '1.2.3'), 0);
    assert.equal(compareVersions('1.2.3+build.1', '1.2.3+build.2'), 0);
  });
});

describe('isValidVersion', () => {
  it('accepts semver with pre-release and rejects the rest', () => {
    assert.ok(isValidVersion('1.0.0-alpha.2'));
    assert.ok(!isValidVersion('1.0'));
    assert.ok(!isValidVersion(undefined));
  });
});

describe('readFrontmatter', () => {
  it('reads name and metadata.version', () => {
    const md = '---\nname: demo\ndescription: >\n  version: nope\nmetadata:\n  author: x\n  version: "1.0.0-alpha.2"\n---\n# body\nversion: 9.9.9';
    assert.deepEqual(readFrontmatter(md), { name: 'demo', version: '1.0.0-alpha.2' });
  });

  it('returns undefined when the fields are missing', () => {
    assert.deepEqual(readFrontmatter('# no frontmatter'), { name: undefined, version: undefined });
  });
});

describe('catalog', () => {
  const skills = listSkills();

  it('has every _i18n directory with at least one language variant', () => {
    const dirs = readdirSync(skillsSource, { withFileTypes: true }).filter((entry) => entry.isDirectory());
    const listed = skills.map((skill) => skill.name);
    for (const dir of dirs) {
      assert.ok(listed.includes(dir.name), `${join('_i18n', dir.name)} has no <lang>/SKILL.md`);
    }
  });

  for (const skill of skills) {
    it(`${skill.name}: name and metadata.version are consistent across languages`, () => {
      for (const variant of skill.variants) {
        assert.equal(variant.name, skill.name, `${variant.lang}: name`);
        assert.ok(isValidVersion(variant.version), `${variant.lang}: invalid metadata.version '${variant.version}'`);
      }
      const versions = new Set(skill.variants.map((variant) => variant.version));
      assert.equal(versions.size, 1, `different versions across languages: ${[...versions].join(', ')}`);
    });
  }
});
