import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { progressFraction, renderBar, stepsFor } from './progress.js';

describe('progress', () => {
  it('install has 7 steps; language and conflicts are conditional (6 or 5); uninstall has 3', () => {
    assert.equal(stepsFor('install', true, true).length, 7);
    assert.equal(stepsFor('install', true).length, 6);
    assert.equal(stepsFor('install', false, true).length, 6);
    assert.equal(stepsFor('install', false).length, 5);
    assert.ok(!stepsFor('install', false).includes('language') && !stepsFor('install', false).includes('conflicts'));
    assert.deepEqual(stepsFor('install', true, true), ['scope', 'skills', 'language', 'conflicts', 'update', 'theme', 'summary']);
    assert.equal(stepsFor('uninstall', true, true).length, 3);
  });
  it('bar counts concluded steps and is full only after the summary', () => {
    const steps = stepsFor('install', true, true);
    assert.equal(progressFraction(steps, 'scope'), 0);
    assert.equal(progressFraction(steps, 'skills'), 1 / 7);
    assert.ok(progressFraction(steps, 'summary') < 1);
    assert.equal(progressFraction(steps, 'summary', true), 1);
  });
  it('recomputes when the language step drops out and shrinks on going back', () => {
    const six = stepsFor('install', false, true);
    assert.equal(progressFraction(six, 'update'), 3 / 6);
    assert.ok(progressFraction(six, 'skills') < progressFraction(six, 'update'));
  });
  it('renders the bar', () => {
    assert.equal(renderBar(0.5, 10, '#', '-'), '#####-----');
    assert.equal(renderBar(2, 4, '#', '-'), '####');
  });
});
