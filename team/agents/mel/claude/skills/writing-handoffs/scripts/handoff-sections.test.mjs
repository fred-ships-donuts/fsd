import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { missing, NEED } from './handoff-sections.mjs';
const HERE = dirname(fileURLToPath(import.meta.url));
test('the template has every section of an L handoff; M needs three; S has none', () => {
  assert.deepEqual(missing('L', readFileSync(join(HERE, '..', 'templates', 'handoff.md'), 'utf8')), []);
  assert.deepEqual(missing('M', '**What to do:** x\n**Files:** y'), ['Verification']);
  assert.equal(missing('S', 'anything'), null); assert.equal(NEED.M.length, 3);
});
test('the rule is the one fsd-arq publish enforces', () => {
  const arq = readFileSync(join(HERE, '..', '..', '..', '..', '..', '..', 'bin', 'fsd-arq'), 'utf8');
  for (const h of NEED.L) assert.ok(arq.includes(`'${h}'`), h);
});
