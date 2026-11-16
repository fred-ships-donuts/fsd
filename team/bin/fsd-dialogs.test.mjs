import { test } from 'node:test';
import assert from 'node:assert/strict';
import { uiDialog } from './fsd-dialogs.mjs';

const onboarding = ['Teach auto mode about your environment?', '', '❯ 1. Yes', '  2. Not now', "  3. Don't show again"].join('\n');

test('o diálogo de onboarding do auto mode é reconhecido, com a tecla "nunca mais"', () => {
  assert.deepEqual(uiDialog(onboarding), { name: 'auto mode onboarding', key: '3' });
});

test('pedido de permissão de verdade não é diálogo da interface', () => {
  assert.equal(uiDialog('Do you want to proceed?\n❯ 1. Yes\n  2. No'), null);
  assert.equal(uiDialog(''), null);
  assert.equal(uiDialog(undefined), null);
});
