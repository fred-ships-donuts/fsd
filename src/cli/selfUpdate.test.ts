import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isGlobalInstall, isNewer, shouldCheck } from './selfUpdate.js';

const now = new Date('2026-11-01T12:00:00Z');
const base = { autoUpdate: true, now, globalInstall: true };

describe('shouldCheck', () => {
  it('checks when never checked or after 24h', () => {
    assert.ok(shouldCheck({ ...base }));
    assert.ok(shouldCheck({ ...base, lastUpdateCheck: '2026-10-31T11:59:00Z' }));
    assert.ok(shouldCheck({ ...base, lastUpdateCheck: 'garbage' }));
  });
  it('does not check within 24h, when disabled, or via npx', () => {
    assert.ok(!shouldCheck({ ...base, lastUpdateCheck: '2026-11-01T00:00:00Z' }));
    assert.ok(!shouldCheck({ ...base, autoUpdate: false }));
    assert.ok(!shouldCheck({ ...base, globalInstall: false }));
  });
});

describe('isGlobalInstall', () => {
  it('detects global vs npx vs local checkout', () => {
    assert.ok(isGlobalInstall('/usr/lib/node_modules/fred-ships-donuts/dist/cli/selfUpdate.js'));
    assert.ok(!isGlobalInstall('/home/u/.npm/_npx/abc/node_modules/fred-ships-donuts/dist/cli/selfUpdate.js'));
    assert.ok(!isGlobalInstall('/home/u/projects/fred-ships-donuts/dist/cli/selfUpdate.js'));
  });
});

describe('isNewer', () => {
  it('uses semver precedence', () => {
    assert.ok(isNewer('1.0.0', '1.0.0-beta'));
    assert.ok(!isNewer('1.0.0', '1.0.0'));
  });
});
