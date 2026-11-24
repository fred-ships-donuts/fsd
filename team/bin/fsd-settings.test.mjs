import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const TEAM = join(dirname(fileURLToPath(import.meta.url)), '..');
const json = (p) => JSON.parse(readFileSync(join(TEAM, p), 'utf8'));
const settingsFiles = ['claude-settings.json', ...readdirSync(join(TEAM, 'agents')).flatMap((a) => ['settings.json', 'settings.session.json'].map((f) => `agents/${a}/claude/${f}`)).filter((p) => existsSync(join(TEAM, p)))];
const READ_ONLY = /^Bash\((grep|egrep|rg|cat|ls|find|head|tail|sed|fsd-map)([ :*)]|$)/;

test('nenhuma regra deny bloqueia o comando de leitura inteiro (a recusa só vale para o caminho)', () => {
  for (const f of settingsFiles) for (const rule of json(f).permissions?.deny ?? []) assert.doesNotMatch(rule, READ_ONLY, `${f}: ${rule}`);
});

test('as regras Read(...) de deny cobrem pastas de outros agentes e segredos, não o repositório nem o worktree', () => {
  for (const f of settingsFiles) for (const rule of json(f).permissions?.deny ?? []) {
    const m = /^Read\((.*)\)$/.exec(rule); if (!m) continue;
    assert.doesNotMatch(m[1], /(^|\/)(wt|repo)(\/|\*|$)|^\*\*?$|^\.\//, `${f}: ${rule}`);
  }
});

test('a saída para a recusa do Bash está no team.md, no team.session.md e no redirects.json', () => {
  for (const f of ['common/team.md', 'common/team.session.md']) {
    const t = readFileSync(join(TEAM, f), 'utf8'); assert.match(t, /Busca de leitura recusada no Bash/, f); assert.match(t, /caminho inteiro e literal/, f); assert.doesNotMatch(t, /use as ferramentas Grep/, f);
  }
  assert.match(readFileSync(join(TEAM, 'redirects.json'), 'utf8'), /"id": "bash-read-refused"/);
  assert.match(readFileSync(join(TEAM, 'common', 'team.md'), 'utf8'), /Bash read-only search refused/);
});
