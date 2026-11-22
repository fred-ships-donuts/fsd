// F4.3 (T4.3.1): o que a sessão nova lê (prompt do papel, regras do time e skills, na versão da sessão) não tem os termos do time no
// tmux: fsd-restart, Monitor, fsd-wait, fsd-notify, avisos colados ([fsd-aviso), fsd-merge. As versões do tmux ficam como estão.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEAM = join(dirname(fileURLToPath(import.meta.url)), '..');
const OLD = /fsd-restart|fsd-wait|fsd-notify|\bMonitor\b|\[fsd-aviso|fsd-merge/;
const skillsOf = (dir) => (existsSync(dir) ? readdirSync(dir).map((s) => { const sd = join(dir, s); const f = existsSync(join(sd, 'SKILL.session.md')) ? 'SKILL.session.md' : 'SKILL.md'; return join(sd, f); }).filter(existsSync) : []);
const ROLES = ['kevin', 'mel', 'stuart', 'bob'];

test('every file a session-runner role reads is free of the tmux-team terms', () => {
  const files = [join(TEAM, 'common', 'team.session.md'), ...skillsOf(join(TEAM, 'common', 'skills')),
    ...ROLES.flatMap((r) => [join(TEAM, 'agents', r, 'claude', 'CLAUDE.session.md'), ...skillsOf(join(TEAM, 'agents', r, 'claude', 'skills'))])];
  const bad = files.flatMap((f) => readFileSync(f, 'utf8').split('\n').map((l, i) => [f.replace(TEAM + '/', ''), i + 1, l]).filter(([, , l]) => OLD.test(l)));
  assert.deepEqual(bad.map(([f, n, l]) => `${f}:${n}: ${l.slice(0, 100)}`), []);
});

test('the session rules say how to talk, wait, deliver, end the turn and close the day', () => {
  const t = readFileSync(join(TEAM, 'common', 'team.session.md'), 'utf8');
  for (const must of ['fsd-diga', 'fsd-espera', 'fsd-duvida', 'fsd-entrega', 'termine o turno', 'Fim do dia', 'memory_handoff_begin', 'cartão']) assert.ok(t.includes(must), must);
  for (const r of ROLES) assert.ok(readFileSync(join(TEAM, 'agents', r, 'claude', 'CLAUDE.session.md'), 'utf8').length > 200, r);
});

test('the tmux versions stay as they are (they still use fsd-restart)', () => {
  assert.match(readFileSync(join(TEAM, 'common', 'team.md'), 'utf8'), /fsd-restart/);
  assert.match(readFileSync(join(TEAM, 'agents', 'stuart', 'claude', 'skills', 'running-dev-workflow', 'SKILL.md'), 'utf8'), /fsd-merge <n>/);
});
