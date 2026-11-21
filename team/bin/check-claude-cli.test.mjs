// T0.1.4: team/setup/check-claude-cli sai 0 só com todas as flags e subcomandos; um claude falso sem um deles faz sair 1.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT = join(dirname(fileURLToPath(import.meta.url)), '..', 'setup', 'check-claude-cli');
const FLAGS = ['--bg', '--bare', '--permission-prompts', '--settings <file-or-json>', '--json-schema <schema>', '--setting-sources <sources>'];
function fake({ drop = '', noSub = '', agentsJson = true } = {}) {
  const d = mkdtempSync(join(tmpdir(), 'fake-claude-')), f = join(d, 'claude');
  const flags = FLAGS.filter((x) => !x.startsWith(drop || '\0')).map((x) => `  ${x}  desc`).join('\\n');
  writeFileSync(f, `#!/bin/sh
if [ "$1" = --help ]; then printf 'Usage: claude [options]\\n${flags}\\n'; exit 0; fi
if [ "$2" = --help ] && [ "$1" != "${noSub}" ]; then echo "Usage: claude $1 [options]"; [ "$1" = agents ] && ${agentsJson ? 'echo "  --json  Print active sessions"' : 'true'}; exit 0; fi
echo "error: unknown command '$1'" >&2; exit 1
`);
  chmodSync(f, 0o755); return f;
}
const run = (claude) => spawnSync(SCRIPT, [], { env: { ...process.env, FSD_CLAUDE: claude }, encoding: 'utf8' });

test('everything present → exit 0', () => { const r = run(fake()); assert.equal(r.status, 0, r.stdout); assert.doesNotMatch(r.stdout, /FALTA/); });
test('a missing flag → exit 1 and names it', () => { const r = run(fake({ drop: '--bare' })); assert.equal(r.status, 1); assert.match(r.stdout, /FALTA flag --bare/); });
test('a missing subcommand → exit 1', () => { const r = run(fake({ noSub: 'respawn' })); assert.equal(r.status, 1); assert.match(r.stdout, /FALTA subcomando respawn/); });
test('agents without --json → exit 1', () => { const r = run(fake({ agentsJson: false })); assert.equal(r.status, 1); assert.match(r.stdout, /FALTA agents --json/); });
test('no claude → exit 2', () => { assert.equal(run('/nonexistent/claude').status, 2); });
