import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, statSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ensureFirstRun, withFirstRun } from './fsd-profile.mjs';

const tmp = () => mkdtempSync(join(tmpdir(), 'fsd-profile-'));
test('perfil novo: grava onboarding e confiança do repo e dos worktrees; a segunda vez não muda nada', () => {
  const d = tmp(); try {
    mkdirSync(join(d, 'repo/.claude/worktrees/a'), { recursive: true }); const f = join(d, '.claude.json');
    assert.equal(ensureFirstRun(f, join(d, 'repo')), 'written');
    const j = JSON.parse(readFileSync(f, 'utf8'));
    assert.equal(j.hasCompletedOnboarding, true);
    assert.equal(j.projects[join(d, 'repo')].hasTrustDialogAccepted, true);
    assert.equal(j.projects[join(d, 'repo/.claude/worktrees/a')].hasTrustDialogAccepted, true);
    const m = statSync(f).mtimeMs; assert.equal(ensureFirstRun(f, join(d, 'repo')), 'current'); assert.equal(statSync(f).mtimeMs, m);
  } finally { rmSync(d, { recursive: true, force: true }); }
});
test('preserva as outras chaves; arquivo ilegível não é tocado', () => {
  assert.equal(withFirstRun({ numStartups: 3, projects: { '/r': { x: 1 } } }, ['/r'], null).json.projects['/r'].x, 1);
  const d = tmp(); try { const f = join(d, '.claude.json'); writeFileSync(f, '{oops'); assert.equal(ensureFirstRun(f, d), 'unreadable'); assert.equal(readFileSync(f, 'utf8'), '{oops'); } finally { rmSync(d, { recursive: true, force: true }); }
});
